{{- define "pvs-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "pvs-frontend.fullname" -}}
{{- printf "%s-%s" (include "pvs-frontend.name" .) .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
