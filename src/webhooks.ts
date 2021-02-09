import fetch from 'node-fetch'
require('dotenv').config()
export const newArticleWebhook = async (user, title, id, description, tags) => {
    fetch(process.env.PUBLIC_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "title": `${title} 📚`,
                "url": `https://technicalmc.xyz/render-article/${id}`,
                "author": {
                    "name": user.username,
                    "icon_url": `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
                },
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "description": description,
                "color": 636699,
                "footer": {
                    "text": tags,
                },
            }],

        })
    });
}
export const newFeaturedArticle = async (title, articleid, description, tag) => {
    fetch(process.env.PUBLIC_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "title": `${title} is now __FEATURED__!`,
                "url": `https://technicalmc.xyz/render-article/${articleid}`,
                "description": description,
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "color": 7473591,
                "footer": {
                    "text": tag,
                },
            }],

        })
    });
}

export const removedArticle = async (title, description, tag, user) => {
    fetch(process.env.MOD_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "author": {
                "name": user.username,
                "icon_url": `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
            },
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "title": `"${title}" is was __**removed**__ 🚫`,
                "description": `Removed by ${user.username}`,
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "color": 16711680,
                "footer": {
                    "text": tag,
                },
            }],

        })
    });
}
export const publicizeArticle = async (title, description, tag, user) => {
    fetch(process.env.MOD_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "author": {
                    "name": user.username,
                    "icon_url": `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`,
                },
                "title": `"${title}" was __**publicized**__ 🔓`,
                "description": `Publicized by ${user.username}`,
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "color": 636699,
                "footer": {
                    "text": tag,
                },
            }],

        })
    });
}
export const privatisedArticle = async (title, description, tag, user) => {
    fetch(process.env.MOD_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "author": {
                    "name": user.username,
                    "icon_url": `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`,
                },
                "title": `"${title}" was __**privatised**__ 🔒`,
                "description": `Privatised by ${user.username}`,
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "color": 16753920,
                "footer": {
                    "text": tag,
                },
            }],

        })
    });
}

export const incomingArticle = async (title, id, description, tag, user) => {
    fetch(process.env.MOD_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "author": {
                    "name": user.username,
                    "icon_url": `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`,
                },
                "url": `https://technicalmc.xyz/render-article/${id}`,
                "title": `"${title}" was __**created**__  📨`,
                "description": `${user.username} just made a new article! Please publicize or remove it! `,
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "color": 16711680,
                "footer": {
                    "text": tag,
                },
            }],

        })
    });
}

export const moddedUserPerms = async (user, userChanged, newRole) => {
    fetch(process.env.MOD_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "username": "Technicalmc.xyz",
            "avatar_url": 'https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/220/height/220?cb=20190917030625',
            "embeds": [{
                "author": {
                    "name": user.username,
                    "icon_url": `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`,
                },
                "title": `"${userChanged}" was made a ${newRole}`,
                "description": `${user.username} changed ${userChanged} to a ${newRole}`,
                "thumbnail": {
                    "url": "https://static.wikia.nocookie.net/minecraft/images/d/d3/KnowledgeBookNew.png/revision/latest/top-crop/width/50/height/50?cb=20190917030625"
                },
                "color": 4356341,
            }],

        })
    });
}

