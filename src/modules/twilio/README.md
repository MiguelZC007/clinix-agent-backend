# Módulo Twilio WhatsApp

Este módulo proporciona funcionalidad para enviar y recibir mensajes de WhatsApp usando la API de Twilio.

## Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
TWILIO_ACCOUNT_SID=tu_account_sid_aqui
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 2. Obtener Credenciales de Twilio

1. Crea una cuenta en [Twilio Console](https://console.twilio.com/)
2. Ve a **Account > API keys & tokens**
3. Copia tu `Account SID` y `Auth Token`
4. Para desarrollo, usa el sandbox de WhatsApp: `whatsapp:+14155238886`

### 3. Configurar Webhook

En la consola de Twilio:
1. Ve a **Messaging > Try it out > Send a WhatsApp message**
2. En **Sandbox settings**, configura el webhook URL:
```
https://tu-dominio.com/v1/twilio/webhook/whatsapp
```

## Endpoints Disponibles

### Enviar mensaje (ventana 24h)

Solo para texto libre dentro de la ventana de 24h (respuesta al usuario o mensaje iniciado por el sistema dentro de ventana).

```http
POST /v1/twilio/whatsapp/send
Content-Type: application/json

{
  "to": "+1234567890",
  "body": "Hola, este es un mensaje de prueba"
}
```

### Enviar plantilla (proactivo, fuera de 24h)

Obligatorio para mensajes proactivos fuera de la ventana de 24h. Solo plantillas aprobadas por WhatsApp (Content SID).

```http
POST /v1/twilio/whatsapp/send-template
Content-Type: application/json

{
  "to": "+1234567890",
  "contentSid": "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "contentVariables": { "1": "Juan", "2": "recordatorio" }
}
```

### Webhook para Mensajes Entrantes

```http
POST /v1/twilio/webhook/whatsapp
```

Este endpoint recibe automáticamente los mensajes enviados a tu número de WhatsApp. **Importante:** la URL configurada en Twilio debe incluir el prefijo global `/v1` (ej: `https://tu-dominio.com/v1/twilio/webhook/whatsapp`).

### Consultar Estado de Mensaje

```http
GET /v1/twilio/message/{messageSid}/status
```

## Uso en Desarrollo

### 1. Configurar Sandbox de WhatsApp

1. Ve a [Twilio Console > Messaging > Try it out > Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Sigue las instrucciones para unirte al sandbox
3. Envía el código de activación desde tu WhatsApp personal

### 2. Probar Envío de Mensajes

```bash
curl -X POST http://localhost:3000/twilio/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Hola desde la API!"
  }'
```

### 3. Configurar Webhook Local (Desarrollo)

Para probar webhooks en desarrollo local, usa [ngrok](https://ngrok.com/):

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer tu servidor local
ngrok http 3000

# Usar la URL de ngrok en la configuración del webhook de Twilio
# Ejemplo: https://abc123.ngrok.io/v1/twilio/webhook/whatsapp
```

### 4. Despliegue detrás de proxy

Si la API está detrás de un proxy o load balancer, la validación de firma (`X-Twilio-Signature`) usa `request.protocol` y `request.get('host')`. Configura **trust proxy** en Express/NestJS y los headers `X-Forwarded-Proto` y `X-Forwarded-Host` para que la URL con la que se calcula la firma coincida con la URL pública configurada en Twilio.

### 5. Alta carga (opcional)

El webhook procesa cada mensaje de forma síncrona (OpenAI + envío de respuesta). Si OpenAI o Twilio tardan, Twilio puede hacer timeout (~15 s) y reenviar. Para producción bajo carga se recomienda el patrón **ACK rápido + cola**: responder 200 enseguida tras validar firma e idempotencia y encolar el trabajo (OpenAI + envío) en una cola (ej: Bull) para no bloquear la request.

## Funcionalidades

- ✅ Envío de mensajes de texto por WhatsApp
- ✅ Envío de mensajes con archivos multimedia
- ✅ Recepción de mensajes entrantes via webhook
- ✅ Logging detallado de mensajes recibidos
- ✅ Consulta de estado de mensajes enviados
- ✅ Validación de datos con DTOs
- ✅ Documentación automática con Swagger

## Estructura de Archivos

```
src/modules/twilio/
├── dto/
│   ├── send-whatsapp-message.dto.ts    # DTO para enviar mensajes (ventana 24h)
│   ├── send-whatsapp-template.dto.ts  # DTO para plantillas proactivas
│   ├── webhook-message.dto.ts          # DTO para webhook entrante
│   ├── create-twilio.dto.ts            # DTO original (compatibilidad)
│   └── update-twilio.dto.ts            # DTO original (compatibilidad)
├── entities/
│   └── twilio.entity.ts                # Entidad original (compatibilidad)
├── guards/
│   └── twilio-webhook.guard.ts         # Validación X-Twilio-Signature
├── reply-message.handler.ts            # Caso de uso: responder mensaje entrante
├── twilio.controller.ts                 # Controlador con endpoints
├── twilio.service.ts                   # Servicio de envío (reply/template/direct)
├── twilio.module.ts                    # Módulo de NestJS
└── README.md                           # Esta documentación
```

## Responsabilidades

- **Respuesta entrante (webhook):** From del mensaje saliente = To del webhook; solo texto libre en ventana 24h.
- **Proactivo (send-template):** Solo plantillas aprobadas; usar cuando el usuario no ha escrito en 24h.

## Próximos Pasos

- [ ] Implementar persistencia de mensajes en base de datos
- [ ] Agregar respuestas automáticas
- [x] Implementar plantillas de mensajes (POST /whatsapp/send-template)
- [x] Agregar validación de firma de webhook de Twilio (TwilioWebhookGuard)
- [x] Implementar rate limiting (webhook: 30/min por From; send/send-template: 20/min por IP)
- [ ] Agregar métricas y monitoreo
