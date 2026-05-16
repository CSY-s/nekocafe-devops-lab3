{{- define "nekocafe.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "nekocafe.fullname" -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
