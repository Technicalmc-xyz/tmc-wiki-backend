import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient();
const {greenBright, red, blue} = require('chalk')
const rankList = ['banned', 'guest', 'trusted', 'editor', 'dev', 'mod']; // 0=banned, 1=guest, 2=trusted, 3=editor, 4=mod, 5=dev
const utils = require('../utils/utils');
export const logout = (req, res) => {
    getUser(req.user).then(r => {
        console.log(blue("id: " + r.id + "; Username: " + r.username + "; Has logged out!"));
    })
    req.logout();
    res.redirect('/');
};

export interface LoginDatabaseParams {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
}

export const LoginDatabase = async ({id, username, discriminator, avatar}: LoginDatabaseParams) => {
    const user = await prisma["user"].findUnique({where: {id: id}});
    if (user === null) {
        console.log(blue(`id: ${id} - username: ${username} has signed up`))
        return await prisma["user"].create({
            data: {
                id: id,
                username: username,
                discriminator: discriminator,
                avatar: avatar,
                rank: "guest"
            }
        })
    } else {
        console.log(blue(`id: ${id} - username: ${username} has logged back in`))
        return await prisma["user"].update({
            where: {id: id},
            data: {
                username: username,
                discriminator: discriminator,
                avatar: avatar
            }
        })
    }
}

export const requirePermission = (rankRequired: string) => (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log(red("THIS USER IS NOT AUTHENTICATED"));
        return res.status(403).send('Not authenticated');
    } else {
        getUser(req.user).then(r => {
            if (rankList.indexOf(r.rank) >= rankList.indexOf(rankRequired)) {
                next();
            } else {
                return res.status(403).send('Incorrect Permission Level');
            }
        })
    }
};


export const modifyPermissions = async (req, res) => {
    const reqBody = utils.cast('object', req.body);
    const id = utils.cast('string', reqBody.discordId);
    const rank = utils.cast('string', reqBody.rank);
    if (!rankList.includes(rank)) {
        return res.status(403).send('NOT A RANK');

    } else if (id.length > 20) {
        return res.status(403).send('DISCORD ID IS TOO LARGE');
    } else {
        await prisma.user.update({
            where: {id: id},
            data: {rank: rank}
        })
            .then(() => {
                console.log(blue('Changed Rank for id: ' + id + ' to ' + rank));
                return res.status(200).send('Changed Rank for id: ' + id + ' to ' + rank);
            })
            .catch((err) => console.log(red(err)))
    }
};

//FIXME running multiple times on load of a screen
export const getUserInfo = (req, res) => {
    let userInfo = {
        authenticated: undefined
    };
    if (req.isAuthenticated()) {
        userInfo.authenticated = true;
        getUser(req.user).then(r => {
            Object.assign(userInfo, r)
            res.send(userInfo)
        })
    } else {
        userInfo.authenticated = false;
        res.send(userInfo);
    }
};

export const getUser = async (id: string) => {
    return await prisma.user.findUnique({where: {id: id}})
}

export const getUsers = async (req, res) =>
    res.send(await prisma.user.findMany())

export const userExists = async (id: string): Promise<boolean> =>
    await prisma.user.findUnique({where: {id: id}}) !== null;
