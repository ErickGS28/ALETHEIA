#!/usr/bin/env bash
# Despliega el modelo de interaccion y el manifiesto de ALETHEIA CLM.
#
# Por que este script y no `ask deploy`: el ASK CLI guarda el id de la skill en
# .ask/ask-states.json, que esta en .gitignore. Desde un clon limpio `ask deploy`
# no sabe a que skill apuntar y CREA UNA NUEVA en vez de actualizar la de siempre.
# Aqui el id va fijo, asi que cualquiera puede desplegar sin sorpresas.
set -euo pipefail

SKILL_ID="${SKILL_ID:-amzn1.ask.skill.2b0d27c4-7cbc-4e53-a5e0-8bcffa083ebe}"
STAGE="${STAGE:-development}"

# Rutas relativas a proposito: en Git Bash una ruta como /c/Users/... le llega al
# CLI (que corre sobre el Node de Windows) como C:\c\Users\... y no la encuentra.
cd "$(dirname "${BASH_SOURCE[0]}")"

echo ">> skill $SKILL_ID ($STAGE)"

for LOCALE in es-MX en-US; do
  MODELO="skill-package/interactionModels/custom/$LOCALE.json"
  if [ ! -f "$MODELO" ]; then
    echo "   $LOCALE: sin modelo, se omite"
    continue
  fi
  echo ">> subiendo $LOCALE"
  ask smapi set-interaction-model \
    -s "$SKILL_ID" -g "$STAGE" -l "$LOCALE" \
    --interaction-model "file:$MODELO" > /dev/null
done

# El manifiesto declara en que locales e idiomas existe la skill. Sin esto, el
# modelo en-US se publica pero la skill no aparece en ingles para nadie.
echo ">> subiendo el manifiesto"
ask smapi update-skill-manifest   -s "$SKILL_ID" -g "$STAGE"   --manifest "file:skill-package/skill.json" > /dev/null

echo ">> esperando a que compilen los modelos"
for _ in $(seq 1 30); do
  ESTADOS=$(ask smapi get-skill-status -s "$SKILL_ID" --resource interactionModel 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const im=(JSON.parse(s).interactionModel)||{};
      console.log(Object.entries(im).map(([l,v])=>
        l+"="+((v.lastUpdateRequest||{}).status||"?")).join(" "));})')
  echo "   $ESTADOS"
  case "$ESTADOS" in
    *IN_PROGRESS*) sleep 10 ;;
    *FAILED*) echo "!! fallo la compilacion del modelo"; exit 1 ;;
    *) break ;;
  esac
done

# Actualizar el manifiesto deshabilita la skill para pruebas: el simulador
# empieza a responder "did not resolve to any intent" en TODAS las frases,
# incluida la de invocacion. Se vuelve a habilitar aqui.
echo ">> rehabilitando para pruebas"
ask smapi set-skill-enablement -s "$SKILL_ID" -g "$STAGE" > /dev/null

echo ">> listo. Probar con:  ask dialog -s $SKILL_ID -l es-MX -g $STAGE"
