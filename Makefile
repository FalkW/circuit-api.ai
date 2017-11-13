.PHONY: build run pull push

build:
	docker build --no-cache -t CircuitDialogFlowAdapter .

run:
	docker run -it --rm --name CircuitDialogFlowAdapter CircuitDialogFlowAdapter

pull:
	git pull git@github.com:FalkW/circuit-api.ai.git
