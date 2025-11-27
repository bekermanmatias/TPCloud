# 🚀 Instrucciones de Inicio Rápido

Este documento te guiará para poner en marcha el sistema de monitoreo IoT de silos.

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn

## 🔧 Instalación

### 1. Instalar todas las dependencias

Desde la raíz del proyecto:

```bash
npm run install:all
```

O manualmente:

```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..

# Simulador
cd simulator
npm install
cd ..
```

## 🎮 Uso

### Opción 1: Ejecutar todo en terminales separadas (Recomendado)

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# O manualmente: cd backend && npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# O manualmente: cd frontend && npm run dev
```

**Terminal 3 - Simulador (Multi-silo recomendado):**
```bash
cd simulator && npm run multi
# O para un solo silo: npm start
```

### Opción 2: Usar scripts de inicio

Puedes crear scripts personalizados según tu sistema operativo para iniciar todo automáticamente.

## 🌐 Acceso

Una vez iniciados todos los servicios:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## 📊 Flujo de Datos

1. El **simulador** genera datos de sensores cada 5 segundos
2. Los datos se envían al **backend** mediante HTTP POST
3. El **backend** almacena los datos (en memoria por defecto)
4. El **frontend** consulta el backend cada 5 segundos para mostrar datos actualizados

## ⚙️ Configuración

### Simulador

Edita `simulator/.env` o variables de entorno:

```env
API_URL=http://localhost:3000/api
SILO_ID=silo-001
INTERVAL_MS=5000
```

### Backend

Edita `backend/.env`:

```env
PORT=3000
# DATABASE_URL=postgresql://usuario:password@localhost:5432/salgest
```

### Frontend

El frontend se conecta automáticamente a `http://localhost:3000/api` por defecto.

## 🐛 Solución de Problemas

### El simulador no puede conectar al backend

- Verifica que el backend esté corriendo en el puerto 3000
- Revisa la variable `API_URL` en el simulador

### El frontend no muestra datos

- Verifica que el backend esté corriendo
- Verifica que el simulador esté enviando datos
- Abre la consola del navegador para ver errores

### Puerto ya en uso

- Cambia el puerto en los archivos de configuración
- O detén el proceso que está usando el puerto

## 📝 Notas

- Por defecto, el backend usa almacenamiento en memoria (los datos se pierden al reiniciar)
- Para persistencia, configura PostgreSQL en `backend/.env`
- El simulador puede ejecutarse independientemente para testing

## 🔄 Próximos Pasos

1. Configurar PostgreSQL para persistencia de datos
2. Integrar con AWS IoT Core
3. Agregar autenticación y autorización
4. Implementar más visualizaciones y reportes

