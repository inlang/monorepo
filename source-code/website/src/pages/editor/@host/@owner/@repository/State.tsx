import { currentPageContext } from "@src/renderer/state.js";
import {
  createContext,
  createResource,
  createSignal,
  JSXElement,
  Resource,
  Setter,
  useContext,
} from "solid-js";
import type { EditorRouteParams, EditorSearchParams } from "./types.js";
import { http, raw } from "@inlang/git-sdk/api";
import { clientSideEnv } from "@env";
import {
  Config as InlangConfig,
  EnvironmentFunctions,
  initialize$import,
} from "@inlang/core/config";
import { createStore, SetStoreFunction } from "solid-js/store";
import type * as ast from "@inlang/core/ast";
import { Result } from "@inlang/core/utilities";
import type { LocalStorageSchema } from "@src/services/local-storage/schema.js";
import {
  getLocalStorage,
  useLocalStorage,
} from "@src/services/local-storage/index.js";
import { createFsFromVolume, Volume } from "memfs";
import {
  isCollaborator,
  repositoryInformation as _repositoryInformation,
} from "@src/services/github/index.js";
import { analytics } from "@src/services/analytics/index.js";

type EditorStateSchema = {
  /**
   * Whether a repository is cloned and when it was cloned.
   *
   * The value is `false` if the repository is not cloned. Otherwise,
   * a Date is provided that reflects the time of when the repository
   * was cloned.
   */
  repositoryIsCloned: Resource<undefined | Date>;
  /**
   * The current branch.
   */
  currentBranch: Resource<string | undefined>;
  /**
   * The current inlang config.
   *
   * Undefined if no inlang config exists/has been found.
   */
  inlangConfig: Resource<InlangConfig | undefined>;
  /**
   * Unpushed changes in the repository.
   */
  unpushedChanges: Resource<Awaited<ReturnType<typeof raw.log>>>;
  /**
   * Additional informaiton about a repository provided by GitHub.
   */
  githubRepositoryInformation: Resource<any>;
  /**
   * Route parameters like `/github.com/inlang/website`.
   *
   * Utility to access the route parameters in a typesafe manner.
   */
  routeParams: () => EditorRouteParams;

  /**
   * Search parameters of editor route like `?branch=main`.
   *
   * Utility to access the route parameters in a typesafe manner.
   */
  searchParams: () => EditorSearchParams;

  /**
   * Virtual filesystem
   */
  fs: () => typeof import("memfs").fs;

  /**
   * The filesystem is not reactive, hence setFsChange to manually
   * trigger re-renders.
   *
   * setFsChange manually to `Date.now()`
   */
  fsChange: () => Date;
  setFsChange: Setter<Date>;

  /**
   * FilterLanguages show or hide the different messages.
   */
  filteredLanguages: () => string[];
  setFilteredLanguages: Setter<string[]>;

  /**
   * The resources in a given repository.
   */
  resources: ast.Resource[];
  setResources: SetStoreFunction<ast.Resource[]>;

  /**
   * The reference resource.
   */
  referenceResource: () => ast.Resource | undefined;

  /**
   * Whether the user is a collaborator of the repository.
   *
   * Check whether the user is logged in before using this resource.
   * Otherwise, the resource might throw an error.
   *
   * @example
   * 	if (user && isCollaborator())
   */
  userIsCollaborator: Resource<boolean>;

  /**
   * The last time the repository was pushed.
   */
  setLastPush: Setter<Date>;
};

const EditorStateContext = createContext<EditorStateSchema>();

export const useEditorState = () => {
  const context = useContext(EditorStateContext);
  if (context === undefined) {
    throw Error(
      "The EditorStateContext is undefined. useEditorState must be used within a EditorStateProvider"
    );
  }
  return context;
};

/**
 * `<EditorStateProvider>` initializes state with a computations such resources.
 *
 * See https://www.solidjs.com/tutorial/stores_context.
 */
export function EditorStateProvider(props: { children: JSXElement }) {
  /**
   *  Date of the last push to the Repo
   */
  const [lastPush, setLastPush] = createSignal<Date>();

  const routeParams = () => currentPageContext.routeParams as EditorRouteParams;

  const searchParams = () =>
    currentPageContext.urlParsed.search as EditorSearchParams;

  const [fsChange, setFsChange] = createSignal(new Date());

  const [filteredLanguages, setFilteredLanguages] = createSignal<string[]>([]);

  const [fs, setFs] = createSignal<typeof import("memfs").fs>(
    createFsFromVolume(new Volume())
  );

  /**
   * The reference resource.
   */
  const referenceResource = () =>
    resources.find(
      (resource) =>
        resource.languageTag.name === inlangConfig()?.referenceLanguage
    );

  const [localStorage] = useLocalStorage() ?? [];

  // re-fetched if currentPageContext changes
  const [repositoryIsCloned] = createResource(
    () => {
      // re-initialize fs on every cloneRepository call
      // until subdirectories are supported
      setFs(createFsFromVolume(new Volume()));
      return {
        fs: fs(),
        routeParams: currentPageContext.routeParams as EditorRouteParams,
        user: localStorage?.user,
        setFsChange,
      };
    },
    async (args) => {
      const result = await cloneRepository(args);
      analytics.capture("clone repository", {
        owner: args.routeParams.owner,
        repository: args.routeParams.repository,
      });
      return result;
    }
  );

  // re-fetched if respository has been cloned
  const [inlangConfig] = createResource(
    () => {
      if (
        repositoryIsCloned.error ||
        repositoryIsCloned.loading ||
        repositoryIsCloned() === undefined
      ) {
        return false;
      }
      return {
        fs: fs(),
      };
    },
    async (args) => {
      const config = await readInlangConfig(args);
      if (config) {
        // setting the origin store because this should not trigger
        // writing to the filesystem.
        setOriginResources(await readResources(config));
        // initialises the languages to all languages
        setFilteredLanguages(config.languages);
      }
      return config;
    }
  );

  // re-fetched if the file system changes
  const [unpushedChanges] = createResource(() => {
    if (
      repositoryIsCloned.error ||
      repositoryIsCloned.loading ||
      repositoryIsCloned() === undefined
    ) {
      return false;
    }
    return {
      fs: fs(),
      repositoryClonedTime: repositoryIsCloned()!,
      lastPushTime: lastPush(),
      // while unpushed changes does not require last fs change,
      // unpushed changed should react to fsChange. Hence, pass
      // the signal to _unpushedChanges
      lastFsChange: fsChange(),
    };
  }, _unpushedChanges);

  const [userIsCollaborator] = createResource(
    /**
     *CreateRresource is not reacting to changes like: "false","Null", or "undefined".
     * Hence, a string needs to be passed to the fetch of the resource.
     */
    () => {
      return {
        user: localStorage?.user ?? "not logged in",
        routeParams: currentPageContext.routeParams as EditorRouteParams,
      };
    },
    async (args) => {
      if (typeof args.user === "string") {
        return false;
      }
      const response = await isCollaborator({
        owner: args.routeParams.owner,
        repository: args.routeParams.repository,
        username: args.user.username,
      });
      return response;
    }
  );

  const [githubRepositoryInformation] = createResource(
    () => {
      if (
        localStorage?.user === undefined ||
        currentPageContext.routeParams.owner === undefined ||
        currentPageContext.routeParams.repository === undefined
      ) {
        return false;
      }
      return {
        user: localStorage.user,
        routeParams: currentPageContext.routeParams,
      };
    },
    async (args) =>
      _repositoryInformation({
        owner: args.routeParams.owner,
        repository: args.routeParams.repository,
      })
  );

  const [currentBranch] = createResource(
    () => {
      if (
        repositoryIsCloned.error ||
        repositoryIsCloned.loading ||
        repositoryIsCloned() === undefined
      ) {
        return false;
      }
      return {
        fs: fs(),
      };
    },
    async (args) => {
      const branch = await raw.currentBranch({
        fs: args.fs,
        dir: "/",
      });
      return branch ?? undefined;
    }
  );

  /**
   * The resources.
   *
   * Read below why the setter function is called setOrigin.
   */
  const [resources, setOriginResources] = createStore<ast.Resource[]>([]);

  /**
   * Custom setStore function to trigger filesystem writes on changes.
   *
   * Listening to changes on an entire store is not possible, see
   * https://github.com/solidjs/solid/discussions/829. A workaround
   * (which seems much better than effects anyways) is to modify the
   * setStore function to trigger the desired side-effect.
   */
  const setResources: typeof setOriginResources = (...args: any) => {
    // @ts-ignore
    setOriginResources(...args);
    const localStorage = getLocalStorage();
    const config = inlangConfig();
    if (config === undefined || localStorage?.user === undefined) {
      return;
    }
    // write to filesystem
    writeResources({
      fs: fs(),
      config,
      setFsChange,
      resources,
      user: localStorage.user,
    });
  };

  return (
    <EditorStateContext.Provider
      value={
        {
          repositoryIsCloned,
          currentBranch,
          inlangConfig,
          unpushedChanges,
          githubRepositoryInformation,
          routeParams,
          searchParams,
          fsChange,
          setFsChange,
          filteredLanguages,
          setFilteredLanguages,
          resources,
          setResources,
          referenceResource,
          userIsCollaborator,
          setLastPush,
          fs,
        } satisfies EditorStateSchema
      }
    >
      {props.children}
    </EditorStateContext.Provider>
  );
}

// ------------------------------------------

async function cloneRepository(args: {
  fs: typeof import("memfs").fs;
  routeParams: EditorRouteParams;
  user: LocalStorageSchema["user"];
  setFsChange: (date: Date) => void;
}): Promise<Date | undefined> {
  const { host, owner, repository } = args.routeParams;
  if (host === undefined || owner === undefined || repository === undefined) {
    return undefined;
  }
  await raw.clone({
    fs: args.fs,
    http,
    dir: "/",
    corsProxy: clientSideEnv.VITE_GIT_REQUEST_PROXY_PATH,
    url: `https://${host}/${owner}/${repository}`,
  });
  // triggering a side effect here to trigger a re-render
  // of components that depends on fs
  const date = new Date();
  args.setFsChange(date);
  return date;
}

/**
 * Pushed changes and pulls right afterwards.
 */
export async function pushChanges(args: {
  fs: typeof import("memfs").fs;
  routeParams: EditorRouteParams;
  user: NonNullable<LocalStorageSchema["user"]>;
  setFsChange: (date: Date) => void;
  setLastPush: (date: Date) => void;
}): Promise<Result<void, Error>> {
  const { host, owner, repository } = args.routeParams;
  if (host === undefined || owner === undefined || repository === undefined) {
    return Result.err(new Error("h3ni329 Invalid route params"));
  }
  const requestArgs = {
    fs: args.fs,
    http,
    dir: "/",
    author: {
      name: args.user.username,
    },
    corsProxy: clientSideEnv.VITE_GIT_REQUEST_PROXY_PATH,
    url: `https://${host}/${owner}/${repository}`,
  };
  try {
    // pull changes before pushing
    // https://github.com/inlang/inlang/issues/250
    const _pull = await pull(args);
    if (_pull.isErr) {
      return Result.err(
        new Error("Failed to pull: " + _pull.error.message, {
          cause: _pull.error,
        })
      );
    }
    const push = await raw.push(requestArgs);
    if (push.ok === false) {
      return Result.err(new Error("Failed to push", { cause: push.error }));
    }
    await raw.pull(requestArgs);
    const time = new Date();
    // triggering a rebuild of everything fs related
    args.setFsChange(time);
    args.setLastPush(time);
    return Result.ok(undefined);
  } catch (error) {
    return Result.err((error as Error) ?? "h3ni329 Unknown error");
  }
}

async function readInlangConfig(args: {
  fs: typeof import("memfs").fs;
}): Promise<InlangConfig | undefined> {
  try {
    const environmentFunctions: EnvironmentFunctions = {
      $import: initialize$import({
        workingDirectory: "/",
        fs: args.fs.promises,
        fetch,
      }),
      $fs: args.fs.promises,
    };
    const file = await args.fs.promises.readFile("./inlang.config.js", "utf-8");
    const withMimeType =
      "data:application/javascript;base64," + btoa(file.toString());

    const module = await import(/* @vite-ignore */ withMimeType);
    // account for breaking change from renaming the config
    // https://github.com/inlang/inlang/issues/291
    //
    // this code can be removed once https://github.com/osmosis-labs/osmosis-frontend
    // is updated to use the new config name
    const config: InlangConfig = await (module.defineConfig
      ? module.defineConfig({
          ...environmentFunctions,
        })
      : module.initializeConfig({
          ...environmentFunctions,
        }));

    return config;
  } catch (error) {
    if ((error as Error).message.includes("ENOENT")) {
      // the config does not exist
      return undefined;
    } else {
      throw error;
    }
  }
}

async function readResources(config: InlangConfig) {
  const resources = await config.readResources({ config });
  return resources;
}

async function writeResources(args: {
  fs: typeof import("memfs").fs;
  config: InlangConfig;
  resources: ast.Resource[];
  user: NonNullable<LocalStorageSchema["user"]>;
  setFsChange: (date: Date) => void;
}) {
  await args.config.writeResources({ ...args });
  const status = await raw.statusMatrix({ fs: args.fs, dir: "/" });
  const filesWithUncomittedChanges = status.filter(
    // files with unstaged and uncomitted changes
    (row) => row[2] === 2 && row[3] === 1
  );
  // add all changes
  for (const file of filesWithUncomittedChanges) {
    await raw.add({ fs: args.fs, dir: "/", filepath: file[0] });
  }
  // commit changes
  await raw.commit({
    fs: args.fs,
    dir: "/",
    author: {
      name: args.user.username,
    },
    message: "inlang: update translations",
  });
  // triggering a side effect here to trigger a re-render
  // of components that depends on fs
  args.setFsChange(new Date());
}

async function _unpushedChanges(args: {
  fs: typeof import("memfs").fs;
  repositoryClonedTime: Date;
  lastPushTime?: Date;
}) {
  if (args.repositoryClonedTime === undefined) {
    return [];
  }
  const unpushedChanges = await raw.log({
    fs: args.fs,
    dir: "/",
    since: args.lastPushTime ? args.lastPushTime : args.repositoryClonedTime,
  });
  return unpushedChanges;
}

async function pull(args: {
  fs: typeof import("memfs").fs;
  user: NonNullable<LocalStorageSchema["user"]>;
  setFsChange: (date: Date) => void;
}) {
  try {
    await raw.pull({
      fs: args.fs,
      http,
      dir: "/",
      corsProxy: clientSideEnv.VITE_GIT_REQUEST_PROXY_PATH,
      singleBranch: true,
      author: {
        name: args.user.username,
      },
      // try to not create a merge commit
      // rebasing would be the best option but it is not supported by isomorphic-git
      // a switch to https://libgit2.org/ seems unavoidable
      fastForward: true,
    });
    const time = new Date();
    // triggering a rebuild of everything fs related
    args.setFsChange(time);
    return Result.ok(undefined);
  } catch (error) {
    return Result.err(error as Error);
  }
}
