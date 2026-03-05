import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X } from 'lucide-react';

const GRAIN_TYPES = ['Soja', 'Maíz', 'Trigo', 'Girasol', 'Sorgo', 'Otro'];

export default function SiloFormModal({ open, silo = null, onClose, onSave, saving }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [height, setHeight] = useState(10);
  const [diameter, setDiameter] = useState(6);
  const [grainType, setGrainType] = useState('Soja');

  const isEdit = !!silo;

  useEffect(() => {
    if (silo) {
      setName(silo.name || '');
      setLocation(silo.location || '');
      setCapacity(silo.capacity ?? 100);
      setHeight(silo.height ?? 10);
      setDiameter(silo.diameter ?? 6);
      setGrainType(silo.grainType || 'Soja');
    } else {
      setName('');
      setLocation('');
      setCapacity(100);
      setHeight(10);
      setDiameter(6);
      setGrainType('Soja');
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
      grainType: grainType.trim()
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de grano</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (t)</label>
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
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diám. (m)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={diameter}
                  onChange={(e) => setDiameter(e.target.value)}
                />
              </div>
            </div>
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
