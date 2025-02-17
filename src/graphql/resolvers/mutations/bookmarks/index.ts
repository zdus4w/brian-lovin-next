import { URL } from 'url'
import { UserInputError } from 'apollo-server-micro'
import { db } from '~/graphql/services/firebase'
import getBookmarkMetaData from './getBookmarkMetaData'
import { BOOKMARKS_COLLECTION } from '~/graphql/constants'

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch (err) {
    return false
  }
}

export async function editBookmark(
  _,
  { id, title, notes = '', category, twitterHandle }
) {
  if (!title || title.length === 0)
    throw new UserInputError('Bookmark must have a title')

  await db
    .collection(BOOKMARKS_COLLECTION)
    .doc(id)
    .update({ title, notes, category, twitterHandle })

  return await db
    .collection(BOOKMARKS_COLLECTION)
    .doc(id)
    .get()
    .then((doc) => doc.data())
    .then((res) => ({ ...res, reactions: res.reactions || 0, id }))
}

export async function addBookmark(_, { url, notes, category, twitterHandle }) {
  if (!isValidUrl(url)) throw new UserInputError('URL was invalid')

  const existingRef = await db
    .collection(BOOKMARKS_COLLECTION)
    .where('url', '==', url)
    .get()
    .then((snapshot) => !snapshot.empty)

  if (existingRef) throw new UserInputError('URL already exists')

  const metadata = await getBookmarkMetaData(url)

  const id = await db
    .collection(BOOKMARKS_COLLECTION)
    .add({
      createdAt: new Date(),
      ...metadata,
      notes,
      category,
      twitterHandle,
      reactions: 0,
    })
    .then(({ id }) => id)

  return await db
    .collection(BOOKMARKS_COLLECTION)
    .doc(id)
    .get()
    .then((doc) => doc.data())
    .then((res) => ({ ...res, id }))
}

export async function deleteBookmark(_, { id }) {
  return await db
    .collection(BOOKMARKS_COLLECTION)
    .doc(id)
    .delete()
    .then(() => true)
}

export async function addBookmarkReaction(_, { id }) {
  const docRef = db.collection(BOOKMARKS_COLLECTION).doc(id)
  const doc = await docRef.get().then((doc) => doc.data())
  const count = doc.reactions ? doc.reactions + 1 : 1

  await docRef.update({
    reactions: count,
  })

  const res = await docRef.get().then((doc) => doc.data())
  return { ...res, id }
}
