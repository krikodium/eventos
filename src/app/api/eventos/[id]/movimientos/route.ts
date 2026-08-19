import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarLote } from "@/lib/movimientos-lote";
import { ROL_COMPROMISO } from "@/lib/pagos-proveedor-utils";
import { resolvePermisos } from "@/lib/permisos";

/**
 * Carga de varios movimientos de un evento en una sola operación.
 *
 * Todo el lote entra en una transacción: si una fila falla, no queda nada a
 * medio escribir. Los permisos se chequean por tipo de movimiento, no una vez
 * para todo, porque un empleado puede cargar caja pero no ingresos.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const permisos = session.user.permisos ?? resolvePermisos(session.user.role, null);

  try {
    const { id: eventoId } = await params;
    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      select: { id: true },
    });
    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const validacion = validarLote(body?.movimientos);
    if (!validacion.ok) {
      return NextResponse.json(
        {
          error: validacion.fila
            ? `Fila ${validacion.fila}: ${validacion.error}`
            : validacion.error,
          fila: validacion.fila,
        },
        { status: 400 }
      );
    }

    // Permisos por tipo: se verifica ANTES de escribir nada.
    for (const mov of validacion.movimientos) {
      if (mov.tipo === "INGRESO" && !isAdmin) {
        return NextResponse.json(
          { error: "Solo un administrador puede registrar cobros" },
          { status: 403 }
        );
      }
      if (mov.tipo === "PROVEEDOR" && !isAdmin && !permisos.registrarPagosProveedorMovimiento) {
        return NextResponse.json(
          { error: "No tenés permiso para registrar pagos a proveedores" },
          { status: 403 }
        );
      }
      if (mov.tipo === "CAJA" && !isAdmin && !permisos.cajaChicaVer) {
        return NextResponse.json(
          { error: "No tenés permiso para cargar caja chica" },
          { status: 403 }
        );
      }
      if (mov.tipo === "UTILERO" && !isAdmin && !permisos.planillaUtilerosAgregar) {
        return NextResponse.json(
          { error: "No tenés permiso para cargar utileros" },
          { status: 403 }
        );
      }
    }

    // Las FK se validan contra la base antes de abrir la transacción, para que
    // un id inventado devuelva un error claro y no un fallo de constraint.
    const proveedorIds = [
      ...new Set(
        validacion.movimientos
          .filter((m) => m.tipo === "PROVEEDOR")
          .map((m) => (m as { proveedorId: string }).proveedorId)
      ),
    ];
    if (proveedorIds.length > 0) {
      const encontrados = await prisma.proveedorEvento.count({
        where: { id: { in: proveedorIds } },
      });
      if (encontrados !== proveedorIds.length) {
        return NextResponse.json({ error: "Algún proveedor no existe" }, { status: 400 });
      }
    }

    const utileroIds = [
      ...new Set(
        validacion.movimientos
          .filter((m) => m.tipo === "UTILERO")
          .map((m) => (m as { utileroId: string }).utileroId)
      ),
    ];
    if (utileroIds.length > 0) {
      const encontrados = await prisma.utilero.count({ where: { id: { in: utileroIds } } });
      if (encontrados !== utileroIds.length) {
        return NextResponse.json({ error: "Algún utilero no existe" }, { status: 400 });
      }
    }

    // Un pago solo puede imputarse a una cotización DEL MISMO evento: sin esto
    // se podría colgar plata de un compromiso de otro evento.
    const compromisoIds = [
      ...new Set(
        validacion.movimientos
          .filter((m) => m.tipo === "PROVEEDOR" && m.compromisoId)
          .map((m) => (m as { compromisoId: string }).compromisoId)
      ),
    ];
    if (compromisoIds.length > 0) {
      const validos = await prisma.pagoProveedor.count({
        where: { id: { in: compromisoIds }, eventoId, rol: ROL_COMPROMISO },
      });
      if (validos !== compromisoIds.length) {
        return NextResponse.json(
          { error: "Alguna cotización no pertenece a este evento" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const mov of validacion.movimientos) {
        if (mov.tipo === "INGRESO") {
          await tx.ingreso.create({
            data: {
              eventoId,
              monto: mov.monto,
              metodoPago: mov.metodoPago,
              tipo: mov.tipoIngreso,
              concepto: mov.concepto,
              numeroFactura: mov.numeroFactura,
              fecha: mov.fecha,
            },
          });
        } else if (mov.tipo === "PROVEEDOR") {
          await tx.pagoProveedor.create({
            data: {
              eventoId,
              proveedorId: mov.proveedorId,
              rubroId: mov.rubroId,
              monto: mov.monto,
              metodoPago: mov.metodoPago,
              concepto: mov.concepto,
              fecha: mov.fecha,
              rol: mov.rol,
              compromisoId: mov.compromisoId,
            },
          });
        } else if (mov.tipo === "CAJA") {
          await tx.cajaChicaEvento.create({
            data: {
              eventoId,
              monto: mov.monto,
              metodoPago: mov.metodoPago,
              sentido: mov.sentido,
              empleadaEncargada: mov.empleadaEncargada,
              concepto: mov.concepto,
              fecha: mov.fecha,
            },
          });
        } else {
          // La tarea es única por (evento, utilero, tipo): recargar la misma
          // actualiza el monto en vez de fallar por constraint.
          await tx.diaUtilero.upsert({
            where: {
              eventoId_utileroId_tipo: {
                eventoId,
                utileroId: mov.utileroId,
                tipo: mov.tipoTarea,
              },
            },
            create: {
              eventoId,
              utileroId: mov.utileroId,
              tipo: mov.tipoTarea,
              dias: mov.dias,
              monto: mov.monto,
            },
            update: { dias: mov.dias, monto: mov.monto },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, cantidad: validacion.movimientos.length });
  } catch (err) {
    console.error("POST movimientos lote:", err);
    return NextResponse.json({ error: "Error al guardar los movimientos" }, { status: 500 });
  }
}
