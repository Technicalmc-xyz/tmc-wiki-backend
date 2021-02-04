import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient();

let args: string[] = process.argv.slice(2);
const id = args[0]
const rank = args[1]

const rankList = ['banned', 'guest', 'trusted', 'editor', 'dev', 'mod']; // 0=banned, 1=guest, 2=trusted, 3=editor, 4=mod, 5=dev
const modifyPermissions = async (id, rank)  => {
  if (!rankList.includes(rank)) {
    return console.log("Not a rank!")

  } else if (id.length > 20) {
    return console.log("Discord Id is too large")
  } else {
    return await prisma.user.update({
      where: {id: id},
      data: {rank: rank}
    })
        .then(() => {
          return console.log('Changed Rank for id: ' + id + ' to ' + rank);
        })
        .catch((err) =>{ return console.log(err)})
  }
};
modifyPermissions(id,rank)