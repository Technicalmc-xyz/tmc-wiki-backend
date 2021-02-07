# Technical Minecraft Wiki API
![book](book.png)


## Getting Started 
1. Install the npm packages with `npm install`

2. turn development server on `npm run dev`
   
3. [Turn on the database container](#postgres-database)

4. View the database with `prisma studio`

## On First Start

1. Generate the new schema
```console
prisma generate
```

2. Migrate the database
```console
prisma migrate dev --preview-feature
```

3. Compile the typescript 
```console
tsc
``` 
3. Run the mod script to give the moderator role to yourself
```console
node lib/scripts/mod_script.js [your-discord-id] mod
```

4. Transfer the metadata from the metadata.json to the database
```console
node lib/scripts/transferMetadata.js
```

## Production
Compile the typescript and start the express server
```console
tsc

node index.js pro
```


## Postgres Database

```console
podman pod create -n poddy -p 8080:8080,5432:5432
podman ps -a --pod
podman run -dt --pod tmc-wiki-pod --rm --name postgres-wiki -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=user -e POSTGRES_DB=wiki -v pgdata:/var/lib/postgresql/data postgres
podman run --pod tmc-wiki-pod --rm -u postgres:postgres -e POSTGRES_HOST=postgres-wiki -e POSTGRES_DB=wiki -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e prodrigestivill/postgres-backup-local
```

## Additional Commands
**lint**
```console
npm pretest -- --fix
```

**Connect to the container in case of needing to run SQL commands**
```console
docker exec -it <PSQL-Container-ID> bash

psql -h localhost -p 5432 -U user -d wiki -W
```
**Prisma commands**

Generate the the schema
```console
prisma generate
```

migrate the db
```console
prisma migrate dev --preview-feature
```