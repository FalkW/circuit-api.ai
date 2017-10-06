.PHONY: build run pull push

build:
	docker build --no-cache -t circuitapiaiadapter .

run:
	docker run -it --rm --name circuitapiaiadapter circuitapiaiadapter

pull:
	git pull git@github.com:FalkW/circuit-api.ai.git
