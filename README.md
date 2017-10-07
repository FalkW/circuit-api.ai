# Circuit-API.ai

A simple application providing an adapter between Unify Circuit - www.circuit.com - Google API.ai - www.api.ai

Requirements:
- Docker - wrote a simple how-to a while ago: https://falkweber.wordpress.com/2017/07/28/docker-quick-start-guide-installing-docker-on-centos-7/
- Circuit SDK and API.ai Client Access Tokens

How to install:
- git clone https://github.com/FalkW/circuit-api.ai.git circuit-api.ai
- cd circuit-api.ai
- rename config.template.json to config.json and enter you id's and keys
- make build

How to run:
- make run