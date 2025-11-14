#!/bin/bash

if [ $# -lt 3 ]; then
  echo "Uso: $0 <tiempo_en_segundos> <output_path> <métrica1> [<métrica2> ...]"
  exit 1
fi

execution_time=$1
shift  # Eliminar el primer parámetro de la lista de argumentos

output_file=$1
shift  # Eliminar el segundo parámetro de la lista de argumentos

metrics=("$@")

prometheus_url="http://localhost:9090"

header="timestamp"
for metric in "${metrics[@]}"; do
  clean_metric=$(echo $metric | sed 's/{testid="[^"]*"}//g')
  header+=",${clean_metric//,/}"  # Eliminar comas para evitar problemas en el CSV
done
echo "$header" > "$output_file"

fetch_data() {
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local line="$timestamp"

  for metric in "${metrics[@]}"; do
    local response=$(curl -s -G "$prometheus_url/api/v1/query" --data-urlencode "query=${metric}")
    local value=$(echo $response | jq -r '.data.result[0].value[1]')
    line+=",${value}"
  done

  echo "$line" >> "$output_file"
}

run_loop() {
  end_time=$((SECONDS+execution_time))  # Calcula el tiempo de finalización
  while [ $SECONDS -lt $end_time ]; do
    fetch_data
    sleep 1  # Espera 1 segundo entre cada ejecución
  done
}

run_loop
