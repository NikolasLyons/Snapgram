import { INewPost, INewUser } from "@/types";
import { account, appwriteConfig, avatars , databases, storage } from './config';
import { ID, Query } from "appwrite";


export async function createUserAccount(user: INewUser){
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email, 
      user.password, 
      user.name
      )
      console.log(newAccount,'newAccount')
      if(!newAccount) throw Error('Account creation failed')
      const avatarUrl = avatars.getInitials(user.name)
      const newUser = await saveUserToDb({
        accountId:newAccount.$id,
        name:newAccount.name,
        email:newAccount.email,
        username:user.username,
        imageUrl:avatarUrl,
      })
      console.log(newUser,'newUser')
      return newUser
  } catch (error) {
   console.log(error)
   return error
  }
}
export async function saveUserToDb(user:{
  accountId:string;
  email:string;
  name:string;
  imageUrl:URL;
  username?:string
}){
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      user
    )
    return newUser
  } catch (error) {
    console.log(error)
  }

}
export async function signInAccount(user:{email:string; password:string}){
  
    try {
      const session = await account.createEmailSession(user.email, user.password)
      return session
    } catch (error) {
      console.log(error)
      return error
    }

}
export async function getCurrentUser(){
try {
  const currentAccount = await account.get()
  if(!currentAccount)  Error('No current user found')
  const currentUser = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal('accountId', currentAccount.$id)]
    )
    if(!currentUser) throw Error('No current user found')
    return currentUser.documents[0]
} catch (error) {
  console.log(error)
}
}
export async function signOutAccount(){
  try {
    const session = await account.deleteSession('current')
    return session
  } catch (error) {
    console.log(error)
    return error
  }
}
export async function createPost(post: INewPost) {
  try {
    // Upload file to appwrite storage
    const uploadedFile = await uploadFile(post.file[0]);

    if (!uploadedFile) throw Error;

    // Get file url
    const fileUrl = getFilePreview(uploadedFile.$id);
    if (!fileUrl) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    // Create post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageId: uploadedFile.$id,
        location: post.location,
        tags: tags,
      }
    );

    if (!newPost) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    return newPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
  try {
    const fileUrl = storage.getFilePreview(
      appwriteConfig.storageId,
      fileId,
      2000,
      2000,
      "top",
      100
    );

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    console.log(error);
  }
}
// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);

    return { status: "ok" };
  } catch (error) {
    console.log(error);
  }
}

export async function getRecentPosts(){
  const posts  = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
    [Query.orderDesc('$createdAt'),Query.limit(20)],
  )
  if(!posts) throw Error('No posts found')
  return posts
}