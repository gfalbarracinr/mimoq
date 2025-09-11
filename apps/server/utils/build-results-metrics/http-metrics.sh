#!/bin/bash

# Verificar que se hayan proporcionado al menos tres parámetros: tiempo, path de salida y una métrica
if [ $# -lt 3 ]; then
  echo "Uso: $0 <tiempo_en_segundos> <output_path> <métrica1> [<métrica2> ...]"
  exit 1
fi

# Tiempo de ejecución en segundos proporcionado como primer parámetro
execution_time=$1
shift  # Eliminar el primer parámetro de la lista de argumentos

# Path del archivo de salida proporcionado como segundo parámetro
output_file=$1
shift  # Eliminar el segundo parámetro de la lista de argumentos

# Lista de métricas proporcionadas como parámetros restantes
metrics=("$@")

# URL de tu instancia local de Prometheus
prometheus_url="http://localhost:9090"

# Crear el archivo de salida y añadir la cabecera
header="timestamp"
for metric in "${metrics[@]}"; do
  # Eliminar la parte {testid="config-server"} del metric
  clean_metric=$(echo $metric | sed 's/{testid="[^"]*"}//g')
  header+=",${clean_metric//,/}"  # Eliminar comas para evitar problemas en el CSV
done
echo "$header" > "$output_file"

# Función para realizar las consultas y guardar los resultados
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

# Función para ejecutar el bucle durante el tiempo especificado
run_loop() {
  end_time=$((SECONDS+execution_time))  # Calcula el tiempo de finalización
  while [ $SECONDS -lt $end_time ]; do
    fetch_data
    sleep 1  # Espera 1 segundo entre cada ejecución
  done
}

# Llamada para ejecutar el bucle durante el tiempo especificado
run_loop
