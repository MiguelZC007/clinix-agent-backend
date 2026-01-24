# API Contracts - Sistema Médico

## Información General

| Propiedad | Valor |
|-----------|-------|
| Base URL | `http://localhost:3000` |
| API Prefix | `/v1` |
| Documentación Swagger | `/api/docs` |
| Content-Type | `application/json` |

---

## Estructura de Respuestas

### Respuesta Exitosa (ApiResponse)

Todas las respuestas exitosas siguen este formato:

```typescript
interface ApiResponse<T> {
  success: boolean;      // siempre true
  data: T;               // datos de la respuesta
  message?: string;      // mensaje opcional
  timestamp: string;     // ISO 8601 timestamp
}
```

**Ejemplo:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan",
    "email": "juan@ejemplo.com"
  },
  "timestamp": "2026-01-18T10:30:00.000Z"
}
```

### Respuesta de Error (ProblemDetails)

Todos los errores siguen el formato RFC 7807:

```typescript
interface ProblemDetails {
  type: string;          // URI que identifica el tipo de error
  title: string;         // título corto del error
  status: number;        // código HTTP
  code: string;          // código interno (VAL_001, RES_001, etc.)
  detail: string;        // descripción detallada
  errors?: ValidationError[];  // errores de validación (opcional)
  timestamp: string;     // ISO 8601 timestamp
}

interface ValidationError {
  field: string;         // campo con error
  message: string;       // mensaje de error
  rejectedValue?: any;   // valor rechazado
}
```

**Ejemplo de error de validación:**
```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Error de validación de campos",
  "status": 400,
  "code": "VAL_001",
  "detail": "Los datos enviados no son válidos",
  "errors": [
    { "field": "email", "message": "email must be an email" },
    { "field": "name", "message": "name should not be empty" }
  ],
  "timestamp": "2026-01-18T10:30:00.000Z"
}
```

### Códigos de Error

| Código | HTTP Status | Descripción |
|--------|-------------|-------------|
| VAL_001 | 400 | Error de validación de campos |
| VAL_002 | 400 | Campo requerido faltante |
| RES_001 | 404 | Recurso no encontrado |
| RES_002 | 409 | Recurso ya existe (duplicado) |
| APP_001 | 409 | Conflicto de horario en cita |
| APP_002 | 400 | Cita no puede ser cancelada |
| AUTH_001 | 401 | No autenticado |
| AUTH_002 | 403 | No autorizado |

---

## Módulo: Auth

### Tipos

```typescript
interface LoginRequest {
  phone: string;        // requerido
  password: string;     // requerido, min 6 caracteres
}

interface LoginResponse {
  accessToken: string;  // JWT válido por 30 días
  user: {
    id: string;
    name: string;
    lastName: string;
    phone: string;
    email: string;
  };
}

interface LogoutResponse {
  message: string;
}
```

### Endpoints

#### Iniciar Sesión
```
POST /v1/auth/login
```

**Request Body:**
```typescript
{
  phone: string;        // requerido
  password: string;     // requerido, min 6 caracteres
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Juan",
      "lastName": "Pérez",
      "phone": "+584241234567",
      "email": "juan@ejemplo.com"
    }
  },
  "timestamp": "2026-01-20T10:30:00.000Z"
}
```

**Errores:**
- `401` - Credenciales inválidas (AUTH_001)

---

#### Cerrar Sesión
```
POST /v1/auth/logout
```

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Sesión cerrada correctamente"
  },
  "timestamp": "2026-01-20T10:30:00.000Z"
}
```

**Errores:**
- `401` - Token no proporcionado o inválido (AUTH_001)

---

### Autenticación

**Endpoints Públicos (NO requieren autenticación):**
- `POST /v1/auth/login` - Iniciar sesión
- `POST /v1/twilio/webhook/whatsapp` - Webhook de Twilio

**Todos los demás endpoints requieren autenticación mediante JWT.**

**Header requerido para endpoints protegidos:**
```
Authorization: Bearer <token>
```

**Características del token:**
- Algoritmo: HS256
- Expiración: 30 días
- Payload: `{ sub: userId, phone: userPhone }`
- Formato: `Bearer <token>` en el header Authorization

**Manejo de tokens:**
- Almacenar el token después del login exitoso
- Incluir el token en todas las peticiones a endpoints protegidos
- Si el token expira o es inválido, recibirás `401 Unauthorized` (AUTH_001)
- Si el token es revocado (logout), recibirás `401 Unauthorized` (AUTH_001)
- No hay refresh token, se debe hacer login nuevamente cuando expire

---

## Módulo: Patients

### Tipos

```typescript
enum Gender {
  MALE = "male",
  FEMALE = "female"
}

interface PatientResponse {
  id: string;           // UUID
  email: string;
  name: string;
  lastName: string;
  phone: string;
  gender?: Gender;
  birthDate?: string;   // ISO 8601 date
  createdAt: string;    // ISO 8601 datetime
  updatedAt: string;    // ISO 8601 datetime
}

interface PatientAntecedents {
  patientId: string;
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  familyHistory: string[];
  updatedAt: string;
}
```

### Endpoints

#### Crear Paciente
```
POST /v1/patients
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  email: string;        // requerido, formato email
  name: string;         // requerido, min 2 caracteres
  lastName: string;     // requerido, min 2 caracteres
  phone: string;        // requerido
  address: string;      // requerido, min 5 caracteres
  password?: string;    // opcional, min 6 caracteres
  gender?: Gender;      // opcional
  birthDate?: string;   // opcional, formato "YYYY-MM-DD"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "paciente@ejemplo.com",
    "name": "Juan",
    "lastName": "Pérez",
    "phone": "+584241234567",
    "address": "Calle 123, Ciudad",
    "gender": "male",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "createdAt": "2026-01-18T10:30:00.000Z",
    "updatedAt": "2026-01-18T10:30:00.000Z"
  },
  "timestamp": "2026-01-18T10:30:00.000Z"
}
```

**Errores:**
- `400` - Datos inválidos
- `409` - Email o teléfono ya existe

---

#### Listar Pacientes
```
GET /v1/patients
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "id": "...", "email": "...", ... }
  ],
  "timestamp": "..."
}
```

---

#### Obtener Paciente
```
GET /v1/patients/:id
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `id` (path) - UUID del paciente

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "id": "...", "email": "...", ... },
  "timestamp": "..."
}
```

**Errores:**
- `404` - Paciente no encontrado

---

#### Actualizar Paciente
```
PATCH /v1/patients/:id
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Parámetros:**
- `id` (path) - UUID del paciente

**Request Body:** (todos los campos son opcionales)
```typescript
{
  email?: string;
  name?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  password?: string;
  gender?: Gender;
  birthDate?: string;
}
```

**Response:** `200 OK` - PatientResponse

**Errores:**
- `404` - Paciente no encontrado
- `409` - Email o teléfono ya existe

---

#### Eliminar Paciente
```
DELETE /v1/patients/:id
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `id` (path) - UUID del paciente

**Response:** `204 No Content`

**Errores:**
- `404` - Paciente no encontrado

---

#### Obtener Antecedentes
```
GET /v1/patients/:id/antecedents
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `id` (path) - UUID del paciente

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "allergies": ["penicilina", "maní"],
    "medications": ["aspirina"],
    "medicalHistory": ["diabetes tipo 2"],
    "familyHistory": ["hipertensión"],
    "updatedAt": "2026-01-18T10:30:00.000Z"
  },
  "timestamp": "..."
}
```

---

#### Actualizar Antecedentes
```
PUT /v1/patients/:id/antecedents
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Parámetros:**
- `id` (path) - UUID del paciente

**Request Body:**
```typescript
{
  allergies?: string[];
  medications?: string[];
  medicalHistory?: string[];
  familyHistory?: string[];
}
```

**Response:** `200 OK` - PatientAntecedents

---

## Módulo: Appointments

### Tipos

```typescript
enum StatusAppointment {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED"
}

interface AppointmentResponse {
  id: string;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  reason: string;
  startAppointment: string;  // ISO 8601 datetime
  endAppointment: string;    // ISO 8601 datetime
  status: StatusAppointment;
  patient: {
    id: string;
    name: string;
    lastName: string;
  };
  doctor: {
    id: string;
    name: string;
    lastName: string;
    specialty: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints

#### Crear Cita
```
POST /v1/appointments
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  patientId: string;      // UUID, requerido
  doctorId: string;       // UUID, requerido
  specialtyId: string;    // UUID, requerido
  startAppointment: string;  // ISO 8601, requerido
  endAppointment: string;    // ISO 8601, requerido
  reason: string;            // requerido, min 3 caracteres
}
```

**Response:** `201 Created` - AppointmentResponse

**Errores:**
- `400` - Fecha inicio >= fecha fin
- `404` - Paciente/Doctor/Especialidad no encontrado
- `409` - Conflicto de horario

---

#### Listar Citas
```
GET /v1/appointments
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Response:** `200 OK` - AppointmentResponse[]

---

#### Obtener Cita
```
GET /v1/appointments/:id
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `id` (path) - UUID de la cita

**Response:** `200 OK` - AppointmentResponse

---

#### Actualizar Cita
```
PATCH /v1/appointments/:id
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Parámetros:**
- `id` (path) - UUID de la cita

**Request Body:**
```typescript
{
  startAppointment?: string;
  endAppointment?: string;
  status?: StatusAppointment;
  reason?: string;
}
```

**Response:** `200 OK` - AppointmentResponse

---

#### Cancelar Cita
```
POST /v1/appointments/:id/cancel
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `id` (path) - UUID de la cita

**Response:** `200 OK` - AppointmentResponse con status CANCELLED

**Errores:**
- `400` - Cita ya cancelada o completada
- `404` - Cita no encontrada

---

#### Citas por Paciente
```
GET /v1/patients/:patientId/appointments
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `patientId` (path) - UUID del paciente

**Response:** `200 OK` - AppointmentResponse[]

---

## Módulo: Clinic Histories

### Tipos

```typescript
interface DiagnosticRequest {
  name: string;
  description: string;
}

interface PhysicalExamRequest {
  name: string;
  description: string;
}

interface VitalSignRequest {
  name: string;
  value: string;
  unit: string;
  measurement: string;
  description?: string;
}

interface PrescriptionMedicationRequest {
  name: string;
  quantity: number;      // min 1
  unit: string;
  frequency: string;
  duration: string;
  indications: string;
  administrationRoute: string;
  description?: string;
}

interface PrescriptionRequest {
  name: string;
  description: string;
  medications: PrescriptionMedicationRequest[];  // min 1
}

interface DiagnosticResponse {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface PhysicalExamResponse {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface VitalSignResponse {
  id: string;
  name: string;
  description?: string;
  value: string;
  unit: string;
  measurement: string;
  createdAt: string;
  updatedAt: string;
}

interface PrescriptionMedicationResponse {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  frequency: string;
  duration: string;
  indications: string;
  administrationRoute: string;
  createdAt: string;
  updatedAt: string;
}

interface PrescriptionResponse {
  id: string;
  name: string;
  description: string;
  medications: PrescriptionMedicationResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ClinicHistoryResponse {
  id: string;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  appointmentId: string;
  consultationReason: string;
  symptoms: string[];
  treatment: string;
  diagnostics: DiagnosticResponse[];
  physicalExams: PhysicalExamResponse[];
  vitalSigns: VitalSignResponse[];
  prescription?: PrescriptionResponse;
  patient: { id: string; name: string; lastName: string; };
  doctor: { id: string; name: string; lastName: string; specialty: string; };
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints

#### Crear Historia Clínica
```
POST /v1/clinic-histories
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  appointmentId: string;      // UUID, requerido
  consultationReason: string; // min 10 caracteres
  symptoms: string[];         // min 1 elemento
  treatment: string;          // min 10 caracteres
  diagnostics: DiagnosticRequest[];
  physicalExams: PhysicalExamRequest[];
  vitalSigns: VitalSignRequest[];
  prescription?: PrescriptionRequest;  // opcional
}
```

**Ejemplo completo:**
```json
{
  "appointmentId": "550e8400-e29b-41d4-a716-446655440003",
  "consultationReason": "Dolor de cabeza persistente desde hace 3 días",
  "symptoms": ["dolor de cabeza", "mareos", "náuseas"],
  "treatment": "Reposo, hidratación y medicamento para el dolor",
  "diagnostics": [
    { "name": "Migraña", "description": "Cefalea tensional" }
  ],
  "physicalExams": [
    { "name": "Examen neurológico", "description": "Sin alteraciones" }
  ],
  "vitalSigns": [
    {
      "name": "Presión arterial",
      "value": "120/80",
      "unit": "mmHg",
      "measurement": "sistólica/diastólica"
    },
    {
      "name": "Temperatura",
      "value": "36.5",
      "unit": "°C",
      "measurement": "axilar"
    }
  ],
  "prescription": {
    "name": "Receta para cefalea",
    "description": "Tratamiento para dolor de cabeza",
    "medications": [
      {
        "name": "Paracetamol",
        "quantity": 20,
        "unit": "tabletas",
        "frequency": "Cada 8 horas",
        "duration": "5 días",
        "indications": "Tomar con alimentos",
        "administrationRoute": "Oral"
      }
    ]
  }
}
```

**Response:** `201 Created` - ClinicHistoryResponse

**Errores:**
- `404` - Cita no encontrada
- `409` - La cita ya tiene historia clínica

---

#### Listar Historias Clínicas
```
GET /v1/clinic-histories
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Response:** `200 OK` - ClinicHistoryResponse[]

---

#### Obtener Historia Clínica
```
GET /v1/clinic-histories/:id
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `id` (path) - UUID de la historia clínica

**Response:** `200 OK` - ClinicHistoryResponse

---

#### Historias Clínicas por Paciente
```
GET /v1/patients/:patientId/clinic-histories
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `patientId` (path) - UUID del paciente

**Response:** `200 OK` - ClinicHistoryResponse[]

---

## Ejemplos de Uso con Fetch

### Configuración Base

```typescript
const API_BASE_URL = 'http://localhost:3000/v1';

const getAuthHeaders = (token?: string) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};
```

### Iniciar Sesión

```typescript
interface LoginRequest {
  phone: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: string;
      name: string;
      lastName: string;
      phone: string;
      email: string;
    };
  };
  timestamp: string;
}

const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al iniciar sesión');
  }
  
  return response.json();
};

// Uso:
const { data } = await login({ phone: '+584241234567', password: 'password123' });
// Guardar el token: localStorage.setItem('token', data.accessToken);
```

### Crear Paciente (con autenticación)

```typescript
interface CreatePatientDto {
  email: string;
  name: string;
  lastName: string;
  phone: string;
  password?: string;
  gender?: 'male' | 'female';
  birthDate?: string;
}

const createPatient = async (
  data: CreatePatientDto,
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/patients`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear paciente');
  }
  
  return response.json();
};
```

### Agendar Cita (con autenticación)

```typescript
interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  specialtyId: string;
  startAppointment: string; // ISO 8601
  endAppointment: string;    // ISO 8601
}

const createAppointment = async (
  data: CreateAppointmentDto,
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al crear cita');
  }
  
  return response.json();
};
```

### Cerrar Sesión

```typescript
const logout = async (token: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al cerrar sesión');
  }
  
  // Eliminar token del almacenamiento
  localStorage.removeItem('token');
};
```

### Manejo de Errores

```typescript
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  errors?: Array<{
    field: string;
    message: string;
    rejectedValue?: any;
  }>;
  timestamp: string;
}

const handleApiError = async (response: Response): Promise<never> => {
  const error: ProblemDetails = await response.json();
  
  switch (error.code) {
    case 'AUTH_001':
      // Token inválido o expirado - redirigir a login
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente');
      
    case 'AUTH_002':
      throw new Error('No tienes permisos para realizar esta acción');
      
    case 'VAL_001':
      // Mostrar errores de validación
      const validationErrors = error.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(validationErrors || error.detail);
      
    case 'RES_001':
      throw new Error('El recurso solicitado no existe');
      
    case 'RES_002':
      throw new Error('Ya existe un registro con estos datos');
      
    case 'APP_001':
      throw new Error('El horario seleccionado no está disponible');
      
    case 'APP_002':
      throw new Error('La cita no puede ser cancelada');
      
    default:
      throw new Error(error.detail || 'Ha ocurrido un error');
  }
};

// Uso en función fetch mejorada
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    await handleApiError(response);
  }
  
  return response.json();
};
```

---

## Flujo de Trabajo Típico

```
1. Iniciar Sesión
   POST /v1/auth/login
   { "phone": "+584241234567", "password": "password123" }
   -> Guardar accessToken

2. Registrar Paciente (con token)
   POST /v1/patients
   Headers: Authorization: Bearer <token>
   
3. Actualizar Antecedentes (opcional)
   PUT /v1/patients/:id/antecedents
   
4. Agendar Cita
   POST /v1/appointments
   
5. Confirmar Cita
   PATCH /v1/appointments/:id
   { "status": "CONFIRMED" }
   
6. Registrar Historia Clínica (después de la consulta)
   POST /v1/clinic-histories
   
7. Completar Cita
   PATCH /v1/appointments/:id
   { "status": "COMPLETED" }

8. Cerrar Sesión (opcional)
   POST /v1/auth/logout
```

---

## Módulo: Twilio WhatsApp

### Endpoints

#### Webhook de WhatsApp (Público)
```
POST /v1/twilio/webhook/whatsapp
```

**Autenticación:** NO requerida (endpoint público para Twilio)

**Headers:**
- `Content-Type: application/x-www-form-urlencoded` (Twilio envía form-data)

**Request Body:** (form-data de Twilio)
```typescript
{
  MessageSid: string;
  AccountSid: string;
  From: string;        // whatsapp:+1234567890
  To: string;          // whatsapp:+14155238886
  Body: string;
  NumMedia: number;
  MediaUrl0?: string;  // Si NumMedia > 0
  MediaContentType0?: string;
  SmsStatus: string;
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Mensaje procesado correctamente",
  "data": {
    "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "from": "whatsapp:+1234567890",
    "to": "whatsapp:+14155238886",
    "body": "Hola, este es un mensaje recibido",
    "hasMedia": false
  }
}
```

**Nota:** Este endpoint es llamado automáticamente por Twilio cuando se recibe un mensaje. No debe ser llamado directamente desde el frontend.

---

#### Enviar Mensaje de WhatsApp
```
POST /v1/twilio/whatsapp/send
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  to: string;      // whatsapp:+1234567890
  body: string;    // Contenido del mensaje
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "status": "queued",
    "to": "whatsapp:+1234567890",
    "from": "whatsapp:+14155238886",
    "body": "Hola, este es un mensaje de prueba",
    "dateCreated": "2024-01-04T14:30:00Z"
  }
}
```

---

#### Obtener Estado de Mensaje
```
GET /v1/twilio/message/:messageSid/status
```

**Autenticación:** Requerida (Bearer Token)

**Headers:**
- `Authorization: Bearer <token>` (requerido)

**Parámetros:**
- `messageSid` (path) - SID del mensaje de Twilio

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "status": "delivered",
    "to": "whatsapp:+1234567890",
    "from": "whatsapp:+14155238886",
    "body": "Hola, este es un mensaje de prueba",
    "dateCreated": "2024-01-04T14:30:00Z",
    "dateSent": "2024-01-04T14:30:05Z",
    "dateUpdated": "2024-01-04T14:30:10Z",
    "price": "-0.0055",
    "priceUnit": "USD"
  }
}
```

---

## CORS

El backend tiene CORS habilitado con las siguientes configuraciones:
- Origin: Permitido
- Methods: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- Credentials: true

**Nota:** El frontend debe incluir `credentials: 'include'` en las peticiones fetch si se usan cookies, aunque en este caso se usa JWT en headers.

---

## Consideraciones Adicionales

### Formato de Fechas
- Todas las fechas se envían y reciben en formato ISO 8601
- Ejemplo: `"2026-01-20T10:30:00.000Z"`
- Para fechas de nacimiento, usar formato: `"YYYY-MM-DD"` (se convertirá automáticamente)

### UUIDs
- Todos los IDs son UUIDs v4
- Formato: `550e8400-e29b-41d4-a716-446655440000`

### Validación
- Todos los campos requeridos deben estar presentes
- Los campos opcionales pueden omitirse o enviarse como `null`
- La validación se realiza en el backend y retorna errores detallados en `ProblemDetails`

### Rate Limiting
- Actualmente no hay rate limiting implementado
- Se recomienda implementar en el frontend para evitar múltiples peticiones simultáneas

### Paginación
- Los endpoints de listado (`GET /v1/patients`, `GET /v1/appointments`, etc.) actualmente retornan todos los registros
- Se recomienda implementar paginación en futuras versiones
