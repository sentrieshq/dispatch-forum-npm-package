import { useMemo, useState, ReactNode } from "react";
import { PublicKey } from "@solana/web3.js";
import { ForumInfo, ForumPost, PostRestriction } from "@usedispatch/client";
import { Loading, LoadingResult } from "../types/loading";
import {
  CollapsibleProps,
  MessageType,
  PopUpModal,
} from "../components/common";
import {
  isResolved,
  isNotFound,
  initial,
  pending,
  onChainAccountNotFound,
  dispatchClientError,
  isSuccess,
  isDispatchClientError,
} from "../utils/loading";
import { DispatchForum } from "./postbox/postboxWrapper";

// TODO(andrew) move this to DispatchForum.getDescription()
// so that function can be properly typed
export interface Description {
  title: string;
  desc: string;
}

export interface ForumData {
  collectionId: PublicKey;
  owners: LoadingResult<PublicKey[]>;
  // TODO(andrew) if/when we optimize moderators, return this
  // field to the main forum data hook
  // moderators: LoadingResult<PublicKey[]>;
  description: Description;
  posts: ForumPost[];
  restriction: LoadingResult<PostRestriction>;
}

// This hook returns all the necessary forum data and a function
// to refresh it
export function useForumData(
  collectionId: PublicKey | null,
  forum: DispatchForum
): {
  forumData: Loading<ForumData>;
  update: () => Promise<void>;
} {
  const [forumData, setForumData] = useState<Loading<ForumData>>(initial());

  // TODO(andrew) make this more generic
  async function fetchOwners(): Promise<LoadingResult<PublicKey[]>> {
    if (collectionId) {
      try {
        const fetchData = await forum.getOwners(collectionId, true);
        if (fetchData) {
          return fetchData;
        } else {
          return onChainAccountNotFound();
        }
      } catch (error) {
        return dispatchClientError(error);
      }
    } else {
      return onChainAccountNotFound();
    }
  }

  // TODO(andrew) when the moderators call is optimized, return
  // the fetchModerators() call to its place here

  async function fetchDescription(): Promise<LoadingResult<Description>> {
    if (collectionId) {
      try {
        const fetchData = await forum.getDescription(collectionId, true);
        if (fetchData) {
          return fetchData;
        } else {
          return onChainAccountNotFound();
        }
      } catch (error) {
        return dispatchClientError(error);
      }
    } else {
      return onChainAccountNotFound();
    }
  }
  async function fetchPosts(): Promise<LoadingResult<ForumPost[]>> {
    if (collectionId) {
      try {
        const fetchData = await forum.getPostsForForum(collectionId, true);
        if (fetchData) {
          return fetchData;
        } else {
          return onChainAccountNotFound();
        }
      } catch (error) {
        return dispatchClientError(error);
      }
    } else {
      return onChainAccountNotFound();
    }
  }

  async function fetchForumPostRestriction(): Promise<
    LoadingResult<PostRestriction>
  > {
    if (collectionId) {
      try {
        const restriction = await forum.getForumPostRestriction(collectionId);
        if (restriction) {
          return restriction;
        } else {
          return onChainAccountNotFound();
        }
      } catch (error) {
        return dispatchClientError(error);
      }
    } else {
      return onChainAccountNotFound();
    }
  }

  async function update() {
    if (collectionId) {
      // Wait for the forum to exist first...
      if (await forum.exists(collectionId)) {
        // Now fetch all related data
        const [owners, description, posts, restriction] =
          await Promise.all([
            fetchOwners(),
            fetchDescription(),
            fetchPosts(),
            fetchForumPostRestriction(),
          ]);

        if (isSuccess(description) && isSuccess(posts)) {
          // If owners and moderators were successfully fetched, then
          // just set them and go
          setForumData({
            collectionId,
            owners,
            description,
            posts,
            restriction,
          });
        } else {
          // We already confirmed the forum existed, so assume
          // there was a failure in loading
          setForumData(dispatchClientError());
        }
      } else {
        setForumData(onChainAccountNotFound());
      }
    } else {
      // TODO(andrew) make collectionId nonnull
      setForumData(onChainAccountNotFound());
    }
  }
  return { forumData, update };
}

export function useModerators(
  collectionId: PublicKey | null,
  forum: DispatchForum
): {
  moderators: Loading<PublicKey[]>,
    update: () => Promise<void>
} {
  const [moderators, setModerators] = useState<Loading<PublicKey[]>>(initial());

  async function fetchModerators(): Promise<LoadingResult<PublicKey[]>> {
    if (collectionId) {
      try {
        const fetchData = await forum.getModerators(collectionId, true);
        if (fetchData) {
          return fetchData;
        } else {
          return onChainAccountNotFound();
        }
      } catch (error) {
        return dispatchClientError(error);
      }
    } else {
      return onChainAccountNotFound();
    }
  }

  async function update() {
    if (collectionId) {
      if (await forum.exists(collectionId)) {
        const fetchResult = await fetchModerators();
        setModerators(fetchResult);
      }
    }
  }

  return { moderators, update };
}

export interface ModalInfo {
  title: string | ReactNode;
  type: MessageType;
  body?: string | ReactNode;
  collapsible?: CollapsibleProps;
}

export function useModal() {
  const [modalInfoList, setModalInfoList] = useState<ModalInfo[]>([]);

  // Enqueue one or more modals to show. Modals are shown in FIFO
  // order
  function showModals(modalsToAdd: ModalInfo[]) {
    setModalInfoList(modalInfoList.concat(modalsToAdd));
  }

  function showModal(modalToAdd: ModalInfo) {
    showModals([modalToAdd]);
  }

  // Close the current modal
  function close() {
    // Pop the first element of the array
    setModalInfoList(modalInfoList.slice(1));
  }

  const modal = useMemo(() => {
    if (modalInfoList.length > 0) {
      const modalInfo = modalInfoList[0];
      return (
        <PopUpModal
          id="create-forum-info"
          visible
          title={modalInfo.title}
          messageType={modalInfo.type}
          body={modalInfo.body}
          collapsible={modalInfo.collapsible}
          okButton={
            <a className="okInfoButton" onClick={close}>
              OK
            </a>
          }
        />
      );
    } else {
      return null;
    }
  }, [modalInfoList]);

  return {
    // The component which can be rendered in react
    modal,
    // a function to close the current modal
    close,
    // functions to show a current modal or modals
    showModal,
    showModals,
    setModals: setModalInfoList,
  };
}
