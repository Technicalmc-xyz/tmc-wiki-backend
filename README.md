# Technical Minecraft Wiki API
![book](book.png)

For development `npm run dev`

For production `node index.ts pro`

Eslint run with fix `npm pretest -- --fix`

### Start Postgres Database Container
```console
docker run -p 5432:5432 -d \
    -e POSTGRES_PASSWORD=pass \
    -e POSTGRES_USER=user \
    -e POSTGRES_DB=wiki \
    -v pgdata:/var/lib/postgresql/data \
    postgres
```

### Connect to the container

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