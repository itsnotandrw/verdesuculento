import type { Metadata } from 'next';
import { CONTACTO } from '@/data/contacto';
import { RESPONSABLE } from '@/data/privacidad';
import PreferenciaCookies from '@/components/PreferenciaCookies';

export const metadata: Metadata = {
  title: 'Política de tratamiento de datos · Vivero Verde Suculento',
  description: 'Qué datos pide la tienda, para qué se usan, con quién se comparten y cómo ejercer tus derechos.',
  alternates: { canonical: '/privacidad' },
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 12 }}>{titulo}</h2>
      <div style={{ color: 'var(--fg-dim)', lineHeight: 1.7, display: 'grid', gap: 12 }}>{children}</div>
    </section>
  );
}

const lista = { paddingLeft: 20, display: 'grid', gap: 6, listStyle: 'disc' } as const;
const enlace = { color: 'var(--accent)', textDecoration: 'underline' } as const;

export default function PrivacidadPage() {
  const sede = CONTACTO.sedes[0];
  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>TUS DATOS</div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 7vw, 56px)', lineHeight: 1.05, marginBottom: 16 }}>
          Política de tratamiento de datos<em style={{ color: 'var(--accent)' }}>.</em>
        </h1>
        <p style={{ color: 'var(--fg-mute)', fontSize: 13 }}>Vigente desde el {RESPONSABLE.fecha}. Ley 1581 de 2012 y normas que la reglamentan.</p>

        <Seccion titulo="Responsable">
          <p><b>{RESPONSABLE.nombre ?? 'Vivero Verde Suculento'}</b>{RESPONSABLE.documento ? ` · ${RESPONSABLE.documento}` : ''}<br />{sede.direccion}<br />Teléfono y WhatsApp: {CONTACTO.telefono}{RESPONSABLE.correo ? <><br />Correo para solicitudes: {RESPONSABLE.correo}</> : null}</p>
          {(!RESPONSABLE.nombre || !RESPONSABLE.documento || !RESPONSABLE.correo) && (
            <p>La razón social, el documento de identificación y el correo para solicitudes se publicarán en esta página. Mientras tanto, atendemos las solicitudes por WhatsApp.</p>
          )}
        </Seccion>

        <Seccion titulo="Qué datos tratamos">
          <ul style={lista}>
            <li><b>Al comprar:</b> nombre, apellido, correo, teléfono, cédula o NIT, dirección de entrega y detalle del pedido.</li>
            <li><b>Al consultar tus pedidos o escribirnos:</b> el correo, el ticket del pedido y lo que nos cuentes.</li>
            <li><b>Al navegar:</b> conteos de visitas sin datos que te identifiquen, y datos técnicos (dirección IP, tipo de navegador) usados para la seguridad del sitio.</li>
          </ul>
          <p>No pedimos ni guardamos los datos de tu tarjeta o de tu banco: el pago en línea ocurre en la página de la pasarela.</p>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <ul style={lista}>
            <li>Preparar, cobrar, despachar y entregar tu pedido.</li>
            <li>Enviarte la confirmación, el comprobante y el seguimiento, y atender garantías y reclamos.</li>
            <li>Prevenir fraude y proteger el sitio.</li>
            <li>Cumplir obligaciones contables, tributarias y legales.</li>
            <li>Medir qué publicidad funciona.</li>
          </ul>
        </Seccion>

        <Seccion titulo="Con quién se comparten">
          <p>Solo con quienes se necesitan para prestar el servicio, y para eso:</p>
          <ul style={lista}>
            <li><b>Pagos:</b> Wompi o la entidad desde la que hagas la transferencia.</li>
            <li><b>Envíos:</b> Envía.com y la transportadora que elijas.</li>
            <li><b>Tecnología:</b> proveedores de alojamiento del sitio y de envío de correos.</li>
            <li><b>Google:</b> reCAPTCHA (seguridad) y Google Ads (medición de anuncios).</li>
            <li><b>Autoridades</b>, cuando la ley lo exija.</li>
          </ul>
          <p>Algunos de estos proveedores procesan información fuera de Colombia. No vendemos tus datos.</p>
        </Seccion>

        <Seccion titulo="Cookies y almacenamiento del navegador">
          <p>Usamos el almacenamiento de tu navegador para recordar tu carrito y tus preferencias. Nuestro conteo de visitas no usa cookies.</p>
          <p>Google puede usar cookies para saber si una compra o una acción vino de un anuncio y para mostrar publicidad relacionada. Puedes decidir aquí:</p>
          <PreferenciaCookies />
          <p>reCAPTCHA se usa para proteger los formularios y tiene su propia <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={enlace}>política de privacidad</a>.</p>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>Puedes conocer, actualizar y rectificar tus datos; pedir prueba de la autorización; saber qué uso les damos; revocar la autorización o pedir que se eliminen cuando no exista un deber legal o contractual de conservarlos; y consultarlos gratis.</p>
          <p>Escríbenos por <a href={CONTACTO.whatsappUrl} target="_blank" rel="noopener noreferrer" style={enlace}>WhatsApp</a>{RESPONSABLE.correo ? ` o a ${RESPONSABLE.correo}` : ''} indicando tu nombre, tu solicitud y cómo contactarte. Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles, con las prórrogas que permite la ley. Si no quedas conforme puedes acudir a la Superintendencia de Industria y Comercio.</p>
        </Seccion>

        <Seccion titulo="Conservación y cambios">
          <p>Guardamos los datos mientras sean necesarios para las finalidades descritas y los plazos legales. Si esta política cambia, publicaremos aquí la nueva versión con su fecha.</p>
        </Seccion>
      </div>
    </div>
  );
}
