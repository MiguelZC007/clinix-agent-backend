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

Todos los endpoints (excepto `/v1/auth/login`) requieren autenticación mediante JWT.

**Header requerido:**
```
Authorization: Bearer <token>
```

**Características del token:**
- Algoritmo: HS256
- Expiración: 30 días
- Payload: `{ sub: userId, phone: userPhone }`

**Decorador `@Public()`:**
Los endpoints marcados con `@Public()` no requieren autenticación.

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

**Request Body:**
```typescript
{
  email: string;        // requerido, formato email
  name: string;         // requerido, min 2 caracteres
  lastName: string;     // requerido, min 2 caracteres
  phone: string;        // requerido
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

**Request Body:** (todos los campos son opcionales)
```typescript
{
  email?: string;
  name?: string;
  lastName?: string;
  phone?: string;
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

**Response:** `204 No Content`

**Errores:**
- `404` - Paciente no encontrado

---

#### Obtener Antecedentes
```
GET /v1/patients/:id/antecedents
```

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

**Request Body:**
```typescript
{
  patientId: string;      // UUID, requerido
  doctorId: string;       // UUID, requerido
  specialtyId: string;    // UUID, requerido
  startAppointment: string;  // ISO 8601, requerido
  endAppointment: string;    // ISO 8601, requerido
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

**Response:** `200 OK` - AppointmentResponse[]

---

#### Obtener Cita
```
GET /v1/appointments/:id
```

**Response:** `200 OK` - AppointmentResponse

---

#### Actualizar Cita
```
PATCH /v1/appointments/:id
```

**Request Body:**
```typescript
{
  startAppointment?: string;
  endAppointment?: string;
  status?: StatusAppointment;
}
```

**Response:** `200 OK` - AppointmentResponse

---

#### Cancelar Cita
```
POST /v1/appointments/:id/cancel
```

**Response:** `200 OK` - AppointmentResponse con status CANCELLED

**Errores:**
- `400` - Cita ya cancelada o completada
- `404` - Cita no encontrada

---

#### Citas por Paciente
```
GET /v1/patients/:patientId/appointments
```

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

**Response:** `200 OK` - ClinicHistoryResponse[]

---

#### Obtener Historia Clínica
```
GET /v1/clinic-histories/:id
```

**Response:** `200 OK` - ClinicHistoryResponse

---

#### Historias Clínicas por Paciente
```
GET /v1/patients/:patientId/clinic-histories
```

**Response:** `200 OK` - ClinicHistoryResponse[]

---

## Ejemplos de Uso con Fetch

### Crear Paciente

```typescript
const createPatient = async (data: CreatePatientDto) => {
  const response = await fetch('http://localhost:3000/v1/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }
  
  return response.json();
};
```

### Agendar Cita

```typescript
const createAppointment = async (data: CreateAppointmentDto) => {
  const response = await fetch('http://localhost:3000/v1/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: data.patientId,
      doctorId: data.doctorId,
      specialtyId: data.specialtyId,
      startAppointment: new Date(data.startDate).toISOString(),
      endAppointment: new Date(data.endDate).toISOString()
    })
  });
  
  return response.json();
};
```

### Manejo de Errores

```typescript
const handleApiError = (error: ProblemDetails) => {
  switch (error.code) {
    case 'VAL_001':
      // Mostrar errores de validación
      error.errors?.forEach(e => console.error(`${e.field}: ${e.message}`));
      break;
    case 'RES_001':
      // Recurso no encontrado
      console.error('El recurso solicitado no existe');
      break;
    case 'RES_002':
      // Duplicado
      console.error('Ya existe un registro con estos datos');
      break;
    case 'APP_001':
      // Conflicto de horario
      console.error('El horario seleccionado no está disponible');
      break;
    default:
      console.error(error.detail);
  }
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

## CORS

El backend tiene CORS habilitado con las siguientes configuraciones:
- Origin: Permitido
- Methods: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- Credentials: true
