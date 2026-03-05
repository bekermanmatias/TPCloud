import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Cpu } from 'lucide-react';
import { GRAIN_TYPES, getDensity, calcCapacidad } from '../constants/grainDensities';

export default function SiloFormModal({ open, silo = null, onClose, onSave, saving, error = '' }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [height, setHeight] = useState(10);
  const [diameter, setDiameter] = useState(6);
  const [grainType, setGrainType] = useState('Soja');
  const [kitCode, setKitCode] = useState('');

  const isEdit = !!silo;

  useEffect(() => {
    if (silo) {
      setName(silo.name || '');
      setLocation(silo.location || '');
      setCapacity(silo.capacity ?? 100);
      setHeight(silo.height ?? 10);
      setDiameter(silo.diameter ?? 6);
      setGrainType(silo.grainType || 'Soja');
      setKitCode(silo.kitCode || '');
    } else {
      setName('');
      setLocation('');
      setCapacity(100);
      setHeight(10);
      setDiameter(6);
      setGrainType('Soja');
      setKitCode('');
    }
  }, [silo, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      location: location.trim() || undefined,
      capacity: Number(capacity),
      height: Number(height),
      diameter: Number(diameter),
      grainType: grainType.trim(),
      kitCode: kitCode.trim() || undefined
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isEdit ? 'Editar silo' : 'Agregar silo'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Silo Principal"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Campo Norte"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Tipo de grano</label>
                {grainType !== 'Otro' && (
                  <span className="text-xs text-gray-400">
                    Densidad: <strong>{Math.round(getDensity(grainType) * 1000)} kg/m³</strong>
                  </span>
                )}
              </div>
              <select
                value={grainType}
                onChange={(e) => setGrainType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-yellow focus:ring-offset-2"
              >
                {GRAIN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Capacidad (t)</label>
                  {grainType !== 'Otro' && Number(height) > 0 && Number(diameter) > 0 && (
                    <button
                      type="button"
                      title="Usar capacidad calculada por volumen × densidad"
                      className="text-xs text-blue-600 hover:underline leading-none"
                      onClick={() => setCapacity(calcCapacidad(Number(diameter), Number(height), grainType))}
                    >
                      Auto
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altura (m)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={height}
                  onChange={(e) => { setHeight(e.target.value); }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diám. (m)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={diameter}
                  onChange={(e) => { setDiameter(e.target.value); }}
                />
              </div>
            </div>
            {isEdit && (
              <div className="border-t pt-4">
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Cpu className="h-4 w-4 text-gray-400" />
                  Vincular dispositivo IoT
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Ingresá el código del kit del dispositivo físico. Los datos de sensores que envíe con ese código se asociarán a este silo.
                </p>
                <Input
                  value={kitCode}
                  onChange={(e) => setKitCode(e.target.value)}
                  placeholder="Ej: SILO-A1B2"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dejá vacío para desvincular el dispositivo.
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear silo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
