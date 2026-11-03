const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'iaew_'
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'iaew_http_request_duration_seconds',
  help: 'Duracion de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'iaew_http_requests_total',
  help: 'Total de peticiones HTTP procesadas',
  labelNames: ['method', 'route', 'status_code']
});

const turnosReservadosTotal = new client.Counter({
  name: 'iaew_turnos_reservados_total',
  help: 'Total de turnos reservados exitosamente'
});

const turnosSolapadosTotal = new client.Counter({
  name: 'iaew_turnos_solapados_total',
  help: 'Total de turnos rechazados por solapamiento'
});

const turnosCanceladosTotal = new client.Counter({
  name: 'iaew_turnos_cancelados_total',
  help: 'Total de turnos cancelados'
});

const recordatoriosProcesadosTotal = new client.Counter({
  name: 'iaew_recordatorios_procesados_total',
  help: 'Total de recordatorios procesados por el worker',
  labelNames: ['status']
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(turnosReservadosTotal);
register.registerMetric(turnosSolapadosTotal);
register.registerMetric(turnosCanceladosTotal);
register.registerMetric(recordatoriosProcesadosTotal);

function recordHttpRequest(method, route, statusCode, durationSeconds) {
  const normRoute = route || 'unknown';
  const normStatus = String(statusCode || 200);
  httpRequestsTotal.inc({ method, route: normRoute, status_code: normStatus });
  httpRequestDurationSeconds.observe({ method, route: normRoute, status_code: normStatus }, durationSeconds);
}

function quantileFromBuckets(buckets, quantile) {
  const sorted = buckets.slice().sort((a, b) => a.le - b.le);
  const total = sorted.length ? sorted[sorted.length - 1].count : 0;
  if (total === 0) return 0;

  const rank = quantile * total;
  let prevLe = 0;
  let prevCount = 0;

  for (const bucket of sorted) {
    if (bucket.count >= rank) {
      if (!Number.isFinite(bucket.le)) return prevLe;
      const inBucket = bucket.count - prevCount;
      if (inBucket === 0) return bucket.le;
      return prevLe + (bucket.le - prevLe) * ((rank - prevCount) / inBucket);
    }
    prevLe = bucket.le;
    prevCount = bucket.count;
  }
  return prevLe;
}

async function getMetricsSummary() {
  const metrics = await register.getMetricsAsJSON();
  const byName = (name) => metrics.find((m) => m.name === name);

  const requests = byName('iaew_http_requests_total');
  let totalRequests = 0;
  let serverErrors = 0;
  let clientErrors = 0;
  for (const v of requests ? requests.values : []) {
    totalRequests += v.value;
    const status = Number(v.labels.status_code);
    if (status >= 500) serverErrors += v.value;
    else if (status >= 400) clientErrors += v.value;
  }

  const histogram = byName('iaew_http_request_duration_seconds');
  const bucketCounts = new Map();
  for (const v of histogram ? histogram.values : []) {
    if (!v.metricName.endsWith('_bucket')) continue;
    const le = v.labels.le === '+Inf' ? Infinity : Number(v.labels.le);
    bucketCounts.set(le, (bucketCounts.get(le) || 0) + v.value);
  }
  const buckets = [...bucketCounts.entries()].map(([le, count]) => ({ le, count }));

  const counterValue = (name, filter) => {
    const metric = byName(name);
    if (!metric) return 0;
    return metric.values
      .filter((v) => !filter || filter(v.labels))
      .reduce((acc, v) => acc + v.value, 0);
  };

  return {
    totalRequests,
    serverErrors,
    clientErrors,
    errorRate: totalRequests ? serverErrors / totalRequests : 0,
    p50Ms: quantileFromBuckets(buckets, 0.5) * 1000,
    p95Ms: quantileFromBuckets(buckets, 0.95) * 1000,
    turnosReservados: counterValue('iaew_turnos_reservados_total'),
    turnosSolapados: counterValue('iaew_turnos_solapados_total'),
    recordatoriosProcesados: counterValue('iaew_recordatorios_procesados_total', (l) => l.status === 'success')
  };
}

module.exports = {
  register,
  recordHttpRequest,
  getMetricsSummary,
  turnosReservadosTotal,
  turnosSolapadosTotal,
  turnosCanceladosTotal,
  recordatoriosProcesadosTotal
};

