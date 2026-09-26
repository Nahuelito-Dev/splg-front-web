#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3100/api}"
CLAVE="${SPLG_CLAVE:?Falta SPLG_CLAVE en el entorno}"
RESET_PASSWORD_PRUEBA="${SPLG_PASSWORD_PRUEBA:-$CLAVE}"
ORIGEN="panel-app"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

curl_json() {
  local metodo="$1"
  local ruta="$2"
  local token="$3"
  local cuerpo="${4:-}"
  local salida="$5"

  if [[ -n "$cuerpo" ]]; then
    curl -sS -o "$salida" -w "%{http_code}" \
      -X "$metodo" "${API_URL}${ruta}" \
      -H "Content-Type: application/json" \
      -H "X-Client-Source: ${ORIGEN}" \
      -H "Authorization: Bearer ${token}" \
      --data "$cuerpo"
  else
    curl -sS -o "$salida" -w "%{http_code}" \
      -X "$metodo" "${API_URL}${ruta}" \
      -H "Content-Type: application/json" \
      -H "X-Client-Source: ${ORIGEN}" \
      -H "Authorization: Bearer ${token}"
  fi
}

login() {
  local email="$1"
  local salida="$tmpdir/login-${email//@/-}.json"
  local codigo
  codigo="$(curl -sS -o "$salida" -w "%{http_code}" \
    -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Client-Source: ${ORIGEN}" \
    --data "{\"email\":\"${email}\",\"password\":\"${CLAVE}\"}")"

  if [[ "$codigo" != "200" && "$codigo" != "201" ]]; then
    echo "ERROR login ${email}: HTTP ${codigo}"
    cat "$salida"
    exit 1
  fi

  jq -r '.accessToken // .token // .access_token' "$salida"
}

probar() {
  local nombre="$1"
  local esperado="$2"
  local metodo="$3"
  local ruta="$4"
  local token="$5"
  local cuerpo="${6:-}"
  local salida="$tmpdir/${nombre//[^a-zA-Z0-9]/_}.json"
  local codigo

  codigo="$(curl_json "$metodo" "$ruta" "$token" "$cuerpo" "$salida")"
  if [[ "$codigo" != "$esperado" ]]; then
    echo "ERROR ${nombre}: esperado ${esperado}, recibido ${codigo}"
    cat "$salida"
    exit 1
  fi

  local mensaje
  mensaje="$(jq -r '(.message // .error // empty) | if type == "array" then join("; ") else . end' "$salida" 2>/dev/null || true)"
  if [[ -n "$mensaje" ]]; then
    echo "OK ${nombre}: HTTP ${codigo} - ${mensaje}"
  else
    echo "OK ${nombre}: HTTP ${codigo}"
  fi
}

primer_item() {
  local archivo="$1"
  local expresion="$2"
  jq -er "$expresion" "$archivo"
}

token_admin="$(login "admin@splg.com")"
token_super="$(login "superadmin@splg.com")"

admins_admin="$tmpdir/admins-admin.json"
curl_json GET "/admin" "$token_admin" "" "$admins_admin" >/dev/null
distributor_slug="$(jq -r '[.[] | select(.user.email == "admin@splg.com")][0].distributor.slug // .[0].distributor.slug // empty' "$admins_admin")"

clientes="$tmpdir/clientes.json"
curl_json GET "/customers?limit=10&offset=0" "$token_admin" "" "$clientes" >/dev/null
cliente="$(primer_item "$clientes" 'if type == "array" then .[0] else (.rows // .customers // [])[0] end')"
customer_id="$(jq -r '.customer_id' <<<"$cliente")"
customer_user_id="$(jq -r '.user_id' <<<"$cliente")"
customer_validated="$(jq -r '.validated' <<<"$cliente")"

choferes="$tmpdir/choferes.json"
curl_json GET "/delivery?limit=10&offset=0" "$token_super" "" "$choferes" >/dev/null
chofer="$(primer_item "$choferes" 'if type == "array" then .[0] else (.rows // .deliveries // [])[0] end')"
delivery_id="$(jq -r '.delivery_id' <<<"$chofer")"
delivery_validated="$(jq -r '.validated' <<<"$chofer")"
delivery_active="$(jq -r '.isActive' <<<"$chofer")"

productos="$tmpdir/productos.json"
if [[ -n "$distributor_slug" ]]; then
  curl_json GET "/gascylinder?limit=10&offset=0&distributor=${distributor_slug}" "$token_admin" "" "$productos" >/dev/null
else
  curl_json GET "/gascylinder?limit=10&offset=0" "$token_admin" "" "$productos" >/dev/null
fi
producto="$(primer_item "$productos" '(.gasCylinders // .rows // .products // [])[0]')"
gas_id="$(jq -r '.gas_cylinder_id' <<<"$producto")"
gas_type="$(jq -r '.type' <<<"$producto")"
gas_weight="$(jq -r '.weight' <<<"$producto")"
gas_price="$(jq -r '.price' <<<"$producto")"
gas_stock="$(jq -r '.stock' <<<"$producto")"
gas_description="$(jq -r '.description // ""' <<<"$producto")"
gas_promotions="$(jq -c '.promotions // []' <<<"$producto")"

probar "GET /admin devuelve rol normalizado" "200" GET "/admin" "$token_super" ""

probar "PATCH cliente validated booleano" "200" PATCH "/customers/${customer_id}" "$token_super" "{\"validated\":${customer_validated}}"
probar "PATCH cliente lat_lang invalido" "400" PATCH "/customers/${customer_id}" "$token_super" '{"lat_lang":"coordenadas invalidas"}'
probar "GET cliente inexistente no encontrado" "404" GET "/customers/00000000-0000-4000-8000-000000000000" "$token_super" ""

probar "PATCH chofer solo campos permitidos" "200" PATCH "/delivery/${delivery_id}" "$token_super" "{\"validated\":${delivery_validated},\"isActive\":${delivery_active}}"
probar "PATCH chofer rechaza campo extra" "400" PATCH "/delivery/${delivery_id}" "$token_super" "{\"validated\":${delivery_validated},\"isActive\":${delivery_active},\"calification\":5}"

probar "Admin empresa valida a su cliente" "200" PATCH "/customers/${customer_id}" "$token_admin" "{\"validated\":${customer_validated}}"
probar "Admin empresa no edita usuario cliente" "403" PATCH "/users/${customer_user_id}" "$token_admin" '{"full_name":"No debe cambiar"}'
probar "Admin empresa no resetea clave cliente" "403" PATCH "/users/${customer_user_id}" "$token_admin" "{\"password\":\"${RESET_PASSWORD_PRUEBA}\"}"
probar "Admin empresa no bloquea cliente" "403" PATCH "/users/${customer_user_id}/block" "$token_admin" '{"block":true}'
probar "Admin empresa no da de baja usuario cliente" "403" DELETE "/users/${customer_user_id}" "$token_admin" ""
probar "Admin empresa no da de baja cliente" "403" DELETE "/customers/${customer_id}" "$token_admin" ""

probar "PATCH producto promociones duplicadas" "400" PATCH "/gascylinder/${gas_id}" "$token_admin" "{\"type\":\"${gas_type}\",\"weight\":${gas_weight},\"price\":${gas_price},\"stock\":${gas_stock},\"promotions\":[{\"quantity\":2,\"discountPercentage\":10},{\"quantity\":2,\"discountPercentage\":15}]}"
probar "PATCH producto sin tipo (no cambió)" "200" PATCH "/gascylinder/${gas_id}" "$token_admin" "{\"weight\":${gas_weight},\"price\":${gas_price},\"stock\":${gas_stock}}"
probar "POST producto tipo repetido" "400" POST "/gascylinder" "$token_admin" "{\"type\":\"${gas_type}\",\"weight\":${gas_weight},\"price\":${gas_price},\"stock\":0,\"promotions\":[{\"quantity\":2,\"discountPercentage\":10}]}"

echo "Verificación de API del panel completa."
