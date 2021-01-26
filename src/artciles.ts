// Post parser
export {};
const {existsSync, promises, readFileSync, writeFile} = require('fs');
const Git = require('nodegit');
const dir = './posts';
const metadataFile = `${dir}/metadata.json`
const {greenBright} = require('chalk')

// ===== POST METADATA ===== //
class PostMetadata {
	id: number;
	title: string;
	tags: string;
	description: string;
	last_edited: number;
	edit_count: number
	constructor() {
		this.id = 0;
		this.title = '';
		this.tags = '';
		this.description = '';
		this.last_edited = Date.now();
		this.edit_count = 0;
	}
}

const postMetadata = new Map();
let nextPostId = 0;
const initialize = () => {
	let metadata;
	let needsToSave = false;
	if (existsSync(metadataFile)) {
		metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
	} else {
		if (existsSync('metadata.json')) {
			metadata = JSON.parse(readFileSync('metadata.json', 'utf8'));
		} else {
			metadata = null;
		}
		needsToSave = true;
	}

	if (metadata) {
		if (Array.isArray(metadata)) {
			// legacy format
			for (let post of metadata) {
				post.id = +post.id;
				post.edit_count = post.edit_count || 0;
				postMetadata.set(post.id, Object.assign(new PostMetadata(), post));
				if (post.id >= nextPostId) {
					nextPostId = post.id + 1;
				}
			}
		} else {
			nextPostId = metadata.nextPostId;
			for (let post of metadata.posts) {
				if (typeof(post.last_edited) === 'string') {
					// Legacy last_edited format (from Date.toDateString())
					const parts = post.last_edited.split(' ');
					const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(parts[1]);
					const day = +parts[2];
					const year = +parts[3];
					post.last_edited = new Date(year, month, day).getTime();
				}
				
				postMetadata.set(post.id, Object.assign(new PostMetadata(), post));
			}
		}
	}

	if (needsToSave) {
		saveMetadata().then(() => console.log('Written initial metadata.json file'));
	}

	Git.Repository.open(`${dir}/.git`).then(() => console.log(greenBright('Found posts git repository')), () => {
		let repo, index;
		Git.Repository.init(dir, 0).then(r => {
			repo = r;
			return repo.refreshIndex();
		})
			.then(i => {
			index = i;
			return index.addAll();
		})
			.then(() => index.write())
			.then(() => index.writeTree())
			.then(oid => {
				const author = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
				const committer = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
				return repo.createCommit('HEAD', author, committer, 'Initial commit', oid, []);
			})
			.then(() => {
				console.log('Created posts git repository');
			});
	});
};

const saveMetadata = async () => {
	await writeFile(metadataFile, JSON.stringify({
		nextPostId: nextPostId,
		posts: Array.from(postMetadata.values())
	}, null, 2), (err) => {
		if (err) {
			console.log(err);
		} else {
			console.log('Metadata saved correctly');
		}
	});
}
exports.saveMetadata = saveMetadata;

const getAllMetadata = () => Array.from(postMetadata.values());
exports.getAllMetadata = getAllMetadata;

const postExists = (postId) => postMetadata.has(postId);
exports.postExists = postExists;

const getMetadata = (postId) => postMetadata.get(postId);
exports.getMetadata = getMetadata;


// ===== POST BODY ===== //

const postBodyCacheLimit = 100;
const postBodyCache = new Map();

const getPostBody = async (postId: number) => {
	if (postBodyCache.has(postId)) {
		// Move this post ID to the end of the cache
		const body = postBodyCache.get(postId);
		postBodyCache.delete(postId);
		postBodyCache.set(postId, body);
		return body;
	}

	while (postBodyCache.size >= postBodyCacheLimit) {
		postBodyCache.delete(postBodyCache.keys().next().value);
	}

	const beautified = await promises.readFile(`${dir}/${postId}.json`, 'utf8');
	const body = JSON.stringify(JSON.parse(beautified));

	postBodyCache.set(postId, body);
	return body;
};
exports.getPostBody = getPostBody;

const setPostBody = async (postId: number, newBody) => {
	if (!postBodyCache.has(postId)) {
		while (postBodyCache.size >= postBodyCacheLimit) {
			postBodyCache.delete(postBodyCache.keys().next().value);
		}
	}

	const beautified = JSON.stringify(JSON.parse(newBody), null, 2);

	postBodyCache.set(postId, newBody);
	await writeFile(`${dir}/${postId}.json`, beautified, {encoding: 'utf8'}, (err) => {
		if (err) {
			console.log(err);
		} else {
			console.log(`Post ${postId} saved successfully`);
		}
	});
}
exports.setPostBody = setPostBody;


// ===== GIT ===== //

const commit = async (postId, message, author, email = `${author}@technicalmc.xyz`) => {
	if (typeof(author) === 'object') {
		let gitUsername = author.discordName;
		if (gitUsername.length > 34) {
			gitUsername = gitUsername.substring(0, 34);
		}
		gitUsername = gitUsername.replace(/\W/g, '_');
		gitUsername += '_' + String(author.discordDiscriminator).padStart(4, '0');
		email = author.discordId + '@technicalmc.xyz';
		author = gitUsername;
	}
	const repo = await Git.Repository.open(`${dir}/.git`);
	const index = await repo.refreshIndex();
	await index.addByPath(`${postId}.json`);
	await index.addByPath('metadata.json');
	await index.write();
	const oid = await index.writeTree();
	const head = await Git.Reference.nameToId(repo, 'HEAD');
	const parent = await repo.getCommit(head);
	const authorSig = Git.Signature.now(author, email);
	const committerSig = Git.Signature.now('tmc-wiki', 'tmc-wiki@technicalmc.xyz');
	const commitId = await repo.createCommit('HEAD', authorSig, committerSig, `[${postId}] ${message}`, oid, [parent]);
	console.log(`Committed change ${commitId} to file ${postId}.json`);
}
exports.commit = commit;


// ===== OTHER ===== //

const createPost = async (author: string, title: string, description: string, tags: string, body: any) => {
	const postId = nextPostId++;
	// save post body before metadata to avoid race condition
	await setPostBody(postId, body);
	const metadata = new PostMetadata();
	metadata.id = postId;
	metadata.title = title;
	metadata.description = description;
	metadata.tags = tags;
	postMetadata.set(postId, metadata);
	await saveMetadata();
	await commit(postId, `Create ${title}`, author);
	return metadata;
}
exports.createPost = createPost;

const getNetworkPostObject = async (postId: number) => {
	const metadata = getMetadata(postId);
	return {
		id: postId,
		title: metadata.title,
		description: metadata.description,
		tags: metadata.tags,
		last_edited: metadata.last_edited,
		editCount: metadata.edit_count,
		body: await getPostBody(postId)
	};
}
exports.getNetworkPostObject = getNetworkPostObject;
initialize();
