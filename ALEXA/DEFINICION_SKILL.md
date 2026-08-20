# ALETHEIA CLM — Definición original de la skill (Actividad 1)

Este documento preserva, en formato Markdown, el contenido de la entrega académica original de
la skill: la **Actividad 1 — Definición skill proyecto integrador** (documento escrito) y la
presentación **"ALETHEIA · CLM · Alexa Skill"** (deck), ambas de la materia *Desarrollo para
Dispositivos Inteligentes*. Se conserva como referencia y evidencia de la fase de diseño; la
especificación técnica vigente, validada contra el backend real, vive en
[`ANALISIS_INTENTS.md`](./ANALISIS_INTENTS.md).

## Identificación

| | |
|---|---|
| **Materia** | Desarrollo para Dispositivos Inteligentes |
| **Universidad** | Universidad Tecnológica de Emiliano Zapata (UTEZ) |
| **Profesor** | Cristian Alexis Campos Roman |
| **Cuatrimestre / Grupo** | 9° / B |
| **Fecha de entrega (Actividad 1)** | 02/06/2026 |
| **Fecha de presentación (deck)** | 15/06/2026 |

## Equipo de desarrollo

- Erick García Salgado
- Ocampo Flores Jonathan
- Ocampo Giles Isaac
- Murga Arcos Angel Santiago
- Martinez Espinoza de los Monteros Iván
- Jiménez Barcelata Isaac

---

## 1. Nombre

**ALETHEIA - CLM** (Sistema de gestión y seguimiento de contratos empresariales)

## 2. Descripción de la skill

La Alexa Skill CLM permite a los gestores y administradores de contratos obtener información
gerencial y métricas de alto nivel mediante comandos de voz. Está dirigida a perfiles directivos y
operativos que necesitan visibilidad inmediata y estratégica de sus procesos contractuales sin
necesidad de interactuar manualmente con la interfaz web. Aporta valor al agilizar la toma de
decisiones, identificar cuellos de botella en el flujo de trabajo y optimizar los tiempos de
respuesta del negocio mediante un enfoque de **"dashboard auditivo"**.

## 3. Propuesta de valor

| | |
|---|---|
| **Audiencia objetivo** | Perfiles directivos y operativos que requieren información gerencial de alto nivel. |
| **Agilidad ejecutiva** | Toma de decisiones inmediata mediante comandos de voz, sin abrir dashboards. |
| **Dashboard auditivo** | Métricas contractuales consultables sin interfaces visuales — solo con la voz. |

## 4. Especificación funcional original

La entrega definía 6 intents (`LaunchRequest`, `ResumenEjecutivoIntent`,
`ConsultarMetricasPorFechaIntent`, `ConsultarContratosPorExpirarIntent`,
`AlertaCuelloDeBotellaIntent`, `HelpIntent`), 2 slots (`rangoFecha`, `estadoContrato`), el flujo de
conversación completo y una tabla de 4 endpoints propuestos contra el backend de ALETHEIA.

Ese detalle — utterances, slots, prompts de elicitación, flujo de conversación paso a paso y
contratos de API — ya está transcrito, verificado y **actualizado contra el schema real del
backend** (incluye el mapeo de estados y los supuestos confirmados con el equipo) en
[`ANALISIS_INTENTS.md`](./ANALISIS_INTENTS.md), que es la fuente de verdad técnica vigente. Este
documento se conserva únicamente como registro del planteamiento académico original.

---

*Convertido de `ALETHEIA-CLM-Skill.pdf` y `Copia de Actividad1Integradora (1).pdf` a Markdown para
reducir el peso del repositorio; los PDF originales fueron eliminados tras la conversión.*
