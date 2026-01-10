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
   https://tu-dominio.com/twilio/webhook/whatsapp
   ```

## Endpoints Disponibles

### Enviar Mensaje de WhatsApp

```http
POST /twilio/whatsapp/send
Content-Type: application/json

{
  "to": "+1234567890",
  "body": "Hola, este es un mensaje de prueba",
  "mediaUrl": "https://example.com/image.jpg" // opcional
}
```

### Webhook para Mensajes Entrantes

```http
POST /twilio/webhook/whatsapp
```

Este endpoint recibe automáticamente los mensajes enviados a tu número de WhatsApp.

### Consultar Estado de Mensaje

```http
GET /twilio/message/{messageSid}/status
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
# Ejemplo: https://abc123.ngrok.io/twilio/webhook/whatsapp
```

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
│   ├── send-whatsapp-message.dto.ts    # DTO para enviar mensajes
│   ├── webhook-message.dto.ts          # DTO para webhook entrante
│   ├── create-twilio.dto.ts            # DTO original (compatibilidad)
│   └── update-twilio.dto.ts            # DTO original (compatibilidad)
├── entities/
│   └── twilio.entity.ts                # Entidad original (compatibilidad)
├── twilio.controller.ts                # Controlador con endpoints
├── twilio.service.ts                   # Servicio con lógica de negocio
├── twilio.module.ts                    # Módulo de NestJS
└── README.md                           # Esta documentación
```

## Próximos Pasos

- [ ] Implementar persistencia de mensajes en base de datos
- [ ] Agregar respuestas automáticas
- [ ] Implementar plantillas de mensajes
- [ ] Agregar validación de firma de webhook de Twilio
- [ ] Implementar rate limiting
- [ ] Agregar métricas y monitoreo
