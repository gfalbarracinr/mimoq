# Configuración automática del registro local
local_resource(
  'setup-registry',
  cmd='bash -c "if ! docker ps | grep -q kind-registry; then docker run -d --restart=always -p 5000:5000 --name kind-registry registry:2; fi && docker network connect kind kind-registry 2>/dev/null || true"',
  deps=[],
  auto_init=True
)

include('./apps/webapp/Tiltfile')
include('./apps/server/Tiltfile')