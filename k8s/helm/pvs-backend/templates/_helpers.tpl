{{- define "pvs-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "pvs-backend.fullname" -}}
{{- printf "%s-%s" (include "pvs-backend.name" .) .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
