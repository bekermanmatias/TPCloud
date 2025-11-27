/**
 * Simulador de sensores IoT para silos de granos
 * Genera datos realistas de temperatura, humedad, nivel de grano y gases
 */

export class SensorSimulator {
  constructor(siloId) {
    this.siloId = siloId;
    
    // Estado base del silo (valores iniciales realistas)
    this.baseState = {
      // Temperatura base: 20-25°C (temperatura ambiente típica)
      baseTemperature: 22 + Math.random() * 3,
      
      // Humedad base: 50-60% (rango seguro para almacenamiento)
      baseHumidity: 55 + Math.random() * 5,
      
      // Nivel de grano: 60-80% (simulando silo parcialmente lleno)
      baseGrainLevel: 70 + Math.random() * 10,
      
      // CO2 base: 400-500 ppm (nivel normal)
      baseCO2: 450 + Math.random() * 50,
    };
    
    // Contadores para variaciones temporales
    this.timeCounter = 0;
    
    // Historial para generar tendencias
    this.temperatureHistory = [];
    this.humidityHistory = [];
  }

  /**
   * Genera un valor de temperatura multipunto
   * Simula 4 sensores DS18B20 en diferentes puntos del silo
   */
  generateTemperature() {
    const sensors = [];
    const baseTemp = this.baseState.baseTemperature;
    
    // Simular variaciones espaciales (zonas más calientes/frías)
    const zones = [
      { offset: -2, variation: 0.5 },  // Zona superior (más fría)
      { offset: 0, variation: 0.3 },   // Zona central
      { offset: 1, variation: 0.4 },    // Zona inferior (más caliente)
      { offset: -1, variation: 0.3 },   // Zona lateral
    ];
    
    // Variación temporal (ciclo día/noche y actividad biológica)
    const timeVariation = Math.sin(this.timeCounter * 0.01) * 2;
    const randomVariation = (Math.random() - 0.5) * 1.5;
    
    zones.forEach((zone, index) => {
      const temp = baseTemp + zone.offset + timeVariation + randomVariation + 
                   (Math.random() - 0.5) * zone.variation;
      
      // Limitar a rango realista (5-35°C)
      sensors.push(Math.max(5, Math.min(35, temp)));
    });
    
    // Calcular estadísticas
    const average = sensors.reduce((a, b) => a + b, 0) / sensors.length;
    const min = Math.min(...sensors);
    const max = Math.max(...sensors);
    
    // Detectar posibles problemas (temperatura alta = fermentación)
    const hasRisk = max > 28 || (max - min) > 5;
    
    return {
      sensors,
      average: parseFloat(average.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      hasRisk
    };
  }

  /**
   * Genera un valor de humedad relativa
   * Simula sensor SHT31 o DHT22
   */
  generateHumidity() {
    const baseHumidity = this.baseState.baseHumidity;
    
    // Variación temporal (humedad aumenta con temperatura)
    const timeVariation = Math.sin(this.timeCounter * 0.008) * 3;
    const randomVariation = (Math.random() - 0.5) * 4;
    
    let humidity = baseHumidity + timeVariation + randomVariation;
    
    // Limitar a rango realista (30-80%)
    humidity = Math.max(30, Math.min(80, humidity));
    
    // Detectar riesgo (humedad alta = riesgo de moho)
    const hasRisk = humidity > 65;
    
    return {
      value: parseFloat(humidity.toFixed(2)),
      hasRisk
    };
  }

  /**
   * Genera un valor de nivel de grano
   * Simula sensor ultrasónico o ToF
   */
  generateGrainLevel() {
    const baseLevel = this.baseState.baseGrainLevel;
    
    // El nivel cambia lentamente (simulando carga/descarga ocasional)
    const slowDrift = Math.sin(this.timeCounter * 0.001) * 2;
    const randomVariation = (Math.random() - 0.5) * 1;
    
    let percentage = baseLevel + slowDrift + randomVariation;
    
    // Limitar a rango 0-100%
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Calcular toneladas (asumiendo silo de 100 toneladas de capacidad)
    const siloCapacity = 100; // toneladas
    const tons = (percentage / 100) * siloCapacity;
    
    // Calcular distancia desde el techo (asumiendo silo de 10m de altura)
    const siloHeight = 10; // metros
    const distance = siloHeight * (1 - percentage / 100);
    
    return {
      percentage: parseFloat(percentage.toFixed(1)),
      tons: parseFloat(tons.toFixed(2)),
      distance: parseFloat(distance.toFixed(2)),
      capacity: siloCapacity
    };
  }

  /**
   * Genera valores de calidad del aire / gases
   * Simula sensor MQ-135 o CO2
   */
  generateGases() {
    const baseCO2 = this.baseState.baseCO2;
    
    // CO2 aumenta con temperatura (fermentación)
    const tempFactor = this.temperatureHistory.length > 0 
      ? (this.temperatureHistory[this.temperatureHistory.length - 1] - 20) * 10
      : 0;
    
    const timeVariation = Math.sin(this.timeCounter * 0.005) * 20;
    const randomVariation = (Math.random() - 0.5) * 30;
    
    let co2 = baseCO2 + tempFactor + timeVariation + randomVariation;
    
    // Limitar a rango realista (350-1000 ppm)
    co2 = Math.max(350, Math.min(1000, co2));
    
    // Detectar riesgo (CO2 alto = fermentación o infestación)
    const hasRisk = co2 > 600;
    
    return {
      co2: parseFloat(co2.toFixed(0)),
      hasRisk
    };
  }

  /**
   * Genera todos los datos del sensor en un objeto
   */
  generateData() {
    const temperature = this.generateTemperature();
    const humidity = this.generateHumidity();
    const grainLevel = this.generateGrainLevel();
    const gases = this.generateGases();
    
    // Guardar historial para tendencias
    this.temperatureHistory.push(temperature.average);
    this.humidityHistory.push(humidity.value);
    
    // Mantener solo últimos 100 valores
    if (this.temperatureHistory.length > 100) {
      this.temperatureHistory.shift();
      this.humidityHistory.shift();
    }
    
    // Incrementar contador de tiempo
    this.timeCounter++;
    
    return {
      temperature,
      humidity: humidity.value,
      humidityRisk: humidity.hasRisk,
      grainLevel,
      gases
    };
  }

  /**
   * Simula un evento de riesgo (fermentación, infestación, etc.)
   * Útil para testing de alertas
   */
  simulateRiskEvent(type = 'fermentation') {
    switch (type) {
      case 'fermentation':
        // Aumentar temperatura y CO2
        this.baseState.baseTemperature += 5;
        this.baseState.baseCO2 += 200;
        break;
      case 'high_humidity':
        // Aumentar humedad
        this.baseState.baseHumidity += 15;
        break;
      case 'low_level':
        // Reducir nivel de grano
        this.baseState.baseGrainLevel -= 20;
        break;
    }
  }

  /**
   * Restablece valores a normales
   */
  resetToNormal() {
    this.baseState = {
      baseTemperature: 22 + Math.random() * 3,
      baseHumidity: 55 + Math.random() * 5,
      baseGrainLevel: 70 + Math.random() * 10,
      baseCO2: 450 + Math.random() * 50,
    };
  }
}

