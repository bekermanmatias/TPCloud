import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Cpu } from 'lucide-react';
import { vincularSilo } from '../services/api';

export default function VincularDispositivo({ silo, onVincularSuccess }) {
  const [kitCode, setKitCode] = useState(silo.kitCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const updated = await vincularSilo(silo.id, kitCode.trim() || null);
      setSuccess(true);
      onVincularSuccess?.(updated);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al vincular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Vincular dispositivo IoT
        </CardTitle>
        <p className="text-sm text-gray-500">
          Ingresá el código del kit del dispositivo físico. Los datos de sensores que envíe con ese código se asociarán a este silo.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              Dispositivo vinculado correctamente.
            </div>
          )}
          <div>
            <label htmlFor="kit_code" className="block text-sm font-medium text-gray-700 mb-1">
              Código del kit
            </label>
            <Input
              id="kit_code"
              type="text"
              value={kitCode}
              onChange={(e) => setKitCode(e.target.value)}
              placeholder="Ej: KIT-ABC123"
              className="max-w-xs"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dejá vacío para desvincular el dispositivo.
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Vincular'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
