export interface SiloEstadoIoT {
  kit_code: string;
  siloId: string;
  timestamp: string; // ISO
  temperatura: number;
  humedad: number;
  gas: number;
  nivel: number;
  fotoSiloPath: string; // ej: "/uploads/silo-photos/xxx.jpg"
  fotoSiloUrl: string; // URL absoluta lista para <img src="...">
}

