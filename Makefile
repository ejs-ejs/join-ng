all:
	( cd src \
	&& zip -r ../join-ng.xpi * )

clean:
	rm -f join-ng.xpi
