.PHONY: build run pull push test

build:
	docker build --no-cache -t ubiqbot .

run:
	docker run -it --rm --name ubiqbot ubiqbot

pull:
	git pull git@github.com:FalkW/UbiqBot.git