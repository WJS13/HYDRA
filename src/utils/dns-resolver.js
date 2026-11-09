import dns from 'node:dns';

/**
 * Resuelve dominios de Hugging Face y Supabase usando servidores DNS públicos (Google / Cloudflare),
 * evitando bloqueos o sinkholes locales de red (como 10.10.10.1).
 */
export function setupDnsResolver() {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);

    const originalLookup = dns.lookup;
    dns.lookup = function (hostname, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      if (
        typeof hostname === 'string' &&
        (hostname.includes('huggingface.co') || hostname.includes('supabase.co'))
      ) {
        dns.resolve4(hostname, (err, addresses) => {
          if (!err && addresses && addresses.length > 0) {
            if (options && options.all) {
              return callback(null, addresses.map(addr => ({ address: addr, family: 4 })));
            }
            return callback(null, addresses[0], 4);
          }
          return originalLookup(hostname, options, callback);
        });
      } else {
        return originalLookup(hostname, options, callback);
      }
    };

    console.log('[Hydra] Resolvedor DNS seguro configurado (Google / Cloudflare DNS activo).');
  } catch (err) {
    console.warn('[Hydra] No se pudo configurar DNS resolver personalizado:', err.message);
  }
}

