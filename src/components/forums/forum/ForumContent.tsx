import * as _ from "lodash";
import {
  useState,
  useEffect,
  ReactNode,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Jdenticon from "react-jdenticon";

import { ForumInfo, ForumPost } from "@usedispatch/client";

import { Plus } from "../../../assets";
import {
  CollapsibleProps,
  MessageType,
  PopUpModal,
  TransactionLink,
} from "../../common";
import { TopicList } from "..";

import { DispatchForum } from "../../../utils/postbox/postboxWrapper";
import { newPublicKey } from "../../../utils/postbox/validateNewPublicKey";
import { useForum } from "../../../contexts/DispatchProvider";
import PermissionsGate from "../../../components/common/PermissionsGate";
import { SCOPES } from "../../../utils/permissions";

interface ForumContentProps {
  forum: ForumInfo;
  forumObject?: DispatchForum;
}

export function ForumContent(props: ForumContentProps) {

  const { forum } = props;
  const DispatchForumObject = useForum();
  const { isNotEmpty: connected, permission } = Forum;
  const mount = useRef(false);

  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topics, setTopics] = useState<ForumPost[]>([]);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatingNewTopic, setCreatingNewTopic] = useState(false);

  const [currentMods, setCurrentMods] = useState<string[]>([]);
  const [showAddModerators, setShowAddModerators] = useState(false);
  const [newModerator, setNewModerator] = useState<string>("");
  const [addingNewModerator, setAddingNewModerator] = useState(false);

  const [showAddAccessToken, setShowAddAccessToken] = useState(false);
  const [accessToken, setAccessToken] = useState<string>();
  const [addingAccessToken, setAddingAccessToken] = useState(false);

  const [modalInfo, setModalInfo] = useState<{
    title: string | ReactNode;
    type: MessageType;
    body?: string | ReactNode;
    collapsible?: CollapsibleProps;
  } | null>(null);

  const getModerators = useCallback(async () => {
    try {
      const mods = await DispatchForumObject.getModerators(forum.collectionId);
      if (!_.isNil(mods)) {
        setCurrentMods(mods.map((m) => m.toBase58()));
      }
    } catch (error) {
      const message = JSON.stringify(error);
      setModalInfo({
        title: "Something went wrong!",
        type: MessageType.error,
        body: "The moderators could not be determined",
        collapsible: { header: "Error", content: message },
      });
    }
  }, [DispatchForumObject]);

  const addModerators = async () => {
    setAddingNewModerator(true);
    try {
      const moderatorId = newPublicKey(newModerator);
      const tx = await DispatchForumObject.addModerator(moderatorId, forum.collectionId);
      setCurrentMods(currentMods.concat(newModerator));
      setNewModerator("");
      setShowAddModerators(false);
      setAddingNewModerator(false);
      setModalInfo({
        title: "Success!",
        type: MessageType.success,
        body: (
          <div className="successBody">
            <div>The moderator was added</div>
            <TransactionLink transaction={tx!} />
          </div>
        ),
      });
    } catch (error: any) {
      setAddingNewModerator(false);
      if (error.code !== 4001) {
        setNewModerator("");
        setShowAddModerators(false);
        setModalInfo({
          title: "Something went wrong!",
          type: MessageType.error,
          body: `The moderators could not be added`,
          collapsible: { header: "Error", content: JSON.stringify(error) },
        });
      }
    }
  };

  const addAccessToken = async () => {
    setAddingAccessToken(true);
    try {
      const token = newPublicKey(accessToken!);

      const tx = await DispatchForumObject.setForumPostRestriction(forum.collectionId, {
        tokenOwnership: { mint: token, amount: 1 },
      });

      setAccessToken("");
      setShowAddAccessToken(false);
      setAddingAccessToken(false);
      setModalInfo({
        title: "Success!",
        type: MessageType.success,
        body: (
          <div className="successBody">
            <div>The access token was added</div>
            <TransactionLink transaction={tx} />
          </div>
        ),
      });
    } catch (error: any) {
      setAddingAccessToken(false);
      if (error.code !== 4001) {
        setAccessToken("");
        setShowAddAccessToken(false);
        setModalInfo({
          title: "Something went wrong!",
          type: MessageType.error,
          body: `The access token could not be added`,
          collapsible: { header: "Error", content: JSON.stringify(error) },
        });
      }
    }
  };

  const getTopicsForForum = async () => {
    try {
      setLoadingTopics(true);
      const topics = await DispatchForumObject.getTopicsForForum(forum.collectionId);
      if (mount.current) {
        setTopics(topics ?? []);
        setLoadingTopics(false);
      }
    } catch (error) {
      setLoadingTopics(false);
      const message = JSON.stringify(error);
      console.log(error);

      setModalInfo({
        title: "Something went wrong!",
        type: MessageType.error,
        body: `The topics for the forum could not be loaded`,
        collapsible: { header: "Error", content: message },
      });
    }
  };

  const createTopic = async () => {
    const p = {
      subj: title,
      body: description,
    };

    setCreatingNewTopic(true);
    try {
      const token = accessToken ? newPublicKey(accessToken) : undefined;
      const tx = await DispatchForumObject.createTopic(
        p,
        forum.collectionId,
        token ? { tokenOwnership: { mint: token, amount: 1 } } : undefined
      );
      if (!_.isNil(tx)) {
        getTopicsForForum();
        setCreatingNewTopic(false);
        setModalInfo({
          body: (
            <div className="successBody">
              <div>The new topic was created</div>
              <TransactionLink transaction={tx} />
            </div>
          ),
          type: MessageType.success,
          title: "Success!",
        });
        setTitle("");
        setDescription("");
        setAccessToken(undefined);
        setShowNewTopicModal(false);
      } else {
        setCreatingNewTopic(false);
        setModalInfo({
          title: "Something went wrong!",
          type: MessageType.error,
          body: `The topic could not be created`,
        });
        setShowNewTopicModal(false);
      }
    } catch (error: any) {
      setCreatingNewTopic(false);
      if (error.code !== 4001) {
        setShowNewTopicModal(false);
        setModalInfo({
          title: "Something went wrong!",
          type: MessageType.error,
          body: `The topic could not be created`,
          collapsible: { header: "Error", content: JSON.stringify(error) },
        });
      }
    }
  };

  const createTopicButton = (
    <button
      className={"createTopicButton"}
      type="button"
      disabled={!permission.readAndWrite}
      onClick={() => {
        if (connected) {
          setShowNewTopicModal(true);
        } else {
          setModalInfo({
            title: "Something went wrong",
            type: MessageType.warning,
            body: "Connect to your wallet in order to create a forum",
          });
        }
      }}>
      <div className="buttonImageContainer">
        <Plus />
      </div>
      Create Topic
    </button>
  );

  const forumHeader = (
    <div className="forumContentHeader">
      <div className="box">
        <div className="description">{forum.description}</div>
        <PermissionsGate
          scopes={[SCOPES.canCreateTopic]}
          >
          {createTopicButton}
        </PermissionsGate>
      </div>
    </div>
  );

  useEffect(() => {
    mount.current = true;
    getTopicsForForum();
    getModerators();
    return () => {
      mount.current = false;
    };
  }, [forum]);

  return (
    <div className="dsp- ">
      <div className="forumContent">
        {!_.isNil(modalInfo) && (
          <PopUpModal
            id="create-topic-info"
            visible
            title={modalInfo.title}
            messageType={modalInfo.type}
            body={modalInfo.body}
            collapsible={modalInfo.collapsible}
            okButton={
              <a className="okButton" onClick={() => setModalInfo(null)}>
                OK
              </a>
            }
          />
        )}
        {showAddAccessToken && _.isNil(modalInfo) && (
          <PopUpModal
            id="add-access-token"
            visible
            title="Limit forum access"
            body={
              <div className="">
                You can enter one token mint ID here such that only holders of
                this token can access this forum. This mint can be for any
                spl-token, eg SOL, NFTs, etc.
                <input
                  type="text"
                  placeholder="Token mint ID"
                  className="newAccessToken"
                  name="accessToken"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
            }
            loading={addingAccessToken}
            onClose={() => setShowAddAccessToken(false)}
            okButton={
              <button
                className="okButton"
                disabled={accessToken?.length === 0}
                onClick={() => addAccessToken()}>
                Save
              </button>
            }
            cancelButton={
              <button
                className="cancelButton"
                onClick={() => setShowAddAccessToken(false)}>
                Cancel
              </button>
            }
          />
        )}
        {showNewTopicModal && _.isNil(modalInfo) && (
          <PopUpModal
            id="create-topic"
            visible
            title={"Create new Topic"}
            body={
              <div className="createTopicBody">
                <>
                  <span className="createTopicLabel">Topic Title</span>
                  <input
                    type="text"
                    placeholder="Title"
                    className="createTopicTitleInput"
                    name="name"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </>
                <>
                  <span className="createTopicLabel">Topic Description</span>
                  <textarea
                    placeholder="Description"
                    className="createTopicTitleInput createTopicTextArea"
                    maxLength={800}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </>
                {(UserRoleType.Moderator === role ||
                  UserRoleType.Owner === role) && (
                  <>
                    <span className="createTopicLabel">Limit post access</span>
                    <input
                      type="text"
                      placeholder="Token mint ID"
                      className="newAccessToken"
                      name="accessToken"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                    />
                  </>
                )}
              </div>
            }
            loading={creatingNewTopic}
            okButton={
              <button
                className="okButton"
                disabled={title.length === 0}
                onClick={() => createTopic()}>
                Create
              </button>
            }
            cancelButton={
              <button
                className="cancelButton"
                onClick={() => setShowNewTopicModal(false)}>
                Cancel
              </button>
            }
          />
        )}
        {_.isNil(modalInfo) && showAddModerators && (
          <PopUpModal
            id="add-moderators"
            visible
            title={"Manage moderators"}
            body={
              <div className="addModeratorsBody">
                <label className="addModeratorsLabel">Add new</label>
                <input
                  placeholder="Add moderator's wallet ID here"
                  className="addModeratorsInput"
                  maxLength={800}
                  value={newModerator}
                  onChange={(e) => setNewModerator(e.target.value)}
                />
                <label className="addModeratorsLabel">Current moderators</label>
                <ul>
                  {currentMods.map((m) => {
                    return (
                      <li key={m} className="currentModerators">
                        <div className="iconContainer">
                          <Jdenticon value={m} alt="moderatorId" />
                        </div>
                        {m}
                      </li>
                    );
                  })}
                </ul>
              </div>
            }
            loading={addingNewModerator}
            okButton={
              <button className="okButton" onClick={() => addModerators()}>
                Save
              </button>
            }
            cancelButton={
              <button
                className="cancelButton"
                onClick={() => setShowAddModerators(false)}>
                Cancel
              </button>
            }
          />
        )}
        {forumHeader}
        <PermissionsGate
          scopes={[SCOPES.canEditMods, SCOPES.canAddForumRestriction]}
          >
          <div className="moderatorToolsContainer">
            <button
              className="moderatorButton"
              disabled={!permission.readAndWrite}
              onClick={() => setShowAddModerators(true)}>
              Manage moderators
            </button>
            <button
              className="moderatorButton"
              disabled={!permission.readAndWrite}
              onClick={() => setShowAddAccessToken(true)}>
              Manage forum access
            </button>
          </div>
          </PermissionsGate>
        {!_.isNil(forum.collectionId) && (
          <TopicList
            loading={loadingTopics}
            topics={topics}
            collectionId={forum.collectionId}
          />
        )}
      </div>
    </div>
  );
}
