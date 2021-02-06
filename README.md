# Technical Minecraft Wiki API
![book](book.png)


### Getting Started 
Install the npm packages with `npm install`

For development `npm run dev`

For production compile the typescript and then run 
```console
tsc

node index.js pro
```

Eslint run with fix `npm pretest -- --fix`

### Podman postgres database and backup of database

```console
podman pod create -n poddy -p 8080:8080,5432:5432
podman ps -a --pod
podman run -dt --pod tmc-wiki-pod --rm --name postgres-wiki -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=user -e POSTGRES_DB=wiki -v pgdata:/var/lib/postgresql/data postgres
podman run --pod tmc-wiki-pod --rm -u postgres:postgres -e POSTGRES_HOST=postgres-wiki -e POSTGRES_DB=wiki -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e prodrigestivill/postgres-backup-local
```

### Connect to the container in case of needing to run SQL commands

```console
docker exec -it <PSQL-Container-ID> bash

psql -h localhost -p 5432 -U user -d wiki -W
```


### View database with prisma studio
```console
prisma studio
```
### Generate the new schema on change of the schema
```console
prisma generate
```

### Migrate DB
```console
prisma migrate dev --preview-feature
```




