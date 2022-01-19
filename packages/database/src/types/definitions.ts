/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/": {
    get: {
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/_prisma_migrations": {
    get: {
      parameters: {
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["_prisma_migrations"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** _prisma_migrations */
          _prisma_migrations?: definitions["_prisma_migrations"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        body: {
          /** _prisma_migrations */
          _prisma_migrations?: definitions["_prisma_migrations"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/language": {
    get: {
      parameters: {
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["language"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** language */
          language?: definitions["language"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        body: {
          /** language */
          language?: definitions["language"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/project": {
    get: {
      parameters: {
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["project"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** project */
          project?: definitions["project"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        body: {
          /** project */
          project?: definitions["project"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/project_member": {
    get: {
      parameters: {
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["project_member"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** project_member */
          project_member?: definitions["project_member"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        body: {
          /** project_member */
          project_member?: definitions["project_member"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/user": {
    get: {
      parameters: {
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["user"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** user */
          user?: definitions["user"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        body: {
          /** user */
          user?: definitions["user"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/rpc/is_member_of_project": {
    post: {
      parameters: {
        body: {
          args: {
            project_id: string;
          };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/rpc/get_user_id_from_email": {
    post: {
      parameters: {
        body: {
          args: {
            arg_email: string;
          };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/rpc/handle_insert_user": {
    post: {
      parameters: {
        body: {
          args: { [key: string]: unknown };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/rpc/handle_insert_project": {
    post: {
      parameters: {
        body: {
          args: { [key: string]: unknown };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
}

export interface definitions {
  _prisma_migrations: {
    /**
     * Note:
     * This is a Primary Key.<pk/>
     */
    id: string;
    checksum: string;
    finished_at?: string;
    migration_name: string;
    logs?: string;
    rolled_back_at?: string;
    started_at: string;
    applied_steps_count: number;
  };
  language: {
    /**
     * Note:
     * This is a Primary Key.<pk/>
     */
    code:
      | "ab"
      | "aa"
      | "af"
      | "ak"
      | "sq"
      | "am"
      | "ar"
      | "an"
      | "hy"
      | "as"
      | "av"
      | "ae"
      | "ay"
      | "az"
      | "bm"
      | "ba"
      | "eu"
      | "be"
      | "bn"
      | "bh"
      | "bi"
      | "bs"
      | "br"
      | "bg"
      | "my"
      | "ca"
      | "km"
      | "ch"
      | "ce"
      | "ny"
      | "zh"
      | "cu"
      | "cv"
      | "kw"
      | "co"
      | "cr"
      | "hr"
      | "cs"
      | "da"
      | "dv"
      | "nl"
      | "dz"
      | "en"
      | "eo"
      | "et"
      | "ee"
      | "fo"
      | "fj"
      | "fi"
      | "fr"
      | "ff"
      | "gd"
      | "gl"
      | "lg"
      | "ka"
      | "de"
      | "ki"
      | "el"
      | "kl"
      | "gn"
      | "gu"
      | "ht"
      | "ha"
      | "he"
      | "hz"
      | "hi"
      | "ho"
      | "hu"
      | "is"
      | "io"
      | "ig"
      | "id"
      | "ia"
      | "ie"
      | "iu"
      | "ik"
      | "ga"
      | "it"
      | "ja"
      | "jv"
      | "kn"
      | "kr"
      | "ks"
      | "kk"
      | "rw"
      | "kv"
      | "kg"
      | "ko"
      | "kj"
      | "ku"
      | "ky"
      | "lo"
      | "la"
      | "lv"
      | "lb"
      | "li"
      | "ln"
      | "lt"
      | "lu"
      | "mk"
      | "mg"
      | "ms"
      | "ml"
      | "mt"
      | "gv"
      | "mi"
      | "mr"
      | "mh"
      | "ro"
      | "mn"
      | "na"
      | "nv"
      | "nd"
      | "ng"
      | "ne"
      | "se"
      | "no"
      | "nb"
      | "nn"
      | "ii"
      | "oc"
      | "oj"
      | "or"
      | "om"
      | "os"
      | "pi"
      | "pa"
      | "ps"
      | "fa"
      | "pl"
      | "pt"
      | "qu"
      | "rm"
      | "rn"
      | "ru"
      | "sm"
      | "sg"
      | "sa"
      | "sc"
      | "sr"
      | "sn"
      | "sd"
      | "si"
      | "sk"
      | "sl"
      | "so"
      | "st"
      | "nr"
      | "es"
      | "su"
      | "sw"
      | "ss"
      | "sv"
      | "tl"
      | "ty"
      | "tg"
      | "ta"
      | "tt"
      | "te"
      | "th"
      | "bo"
      | "ti"
      | "to"
      | "ts"
      | "tn"
      | "tr"
      | "tk"
      | "tw"
      | "ug"
      | "uk"
      | "ur"
      | "uz"
      | "ve"
      | "vi"
      | "vo"
      | "wa"
      | "cy"
      | "fy"
      | "wo"
      | "xh"
      | "yi"
      | "yo"
      | "za"
      | "zu";
    /**
     * Note:
     * This is a Primary Key.<pk/>
     * This is a Foreign Key to `project.id`.<fk table='project' column='id'/>
     */
    project_id: string;
    file: string;
  };
  project_member: {
    /**
     * Note:
     * This is a Primary Key.<pk/>
     * This is a Foreign Key to `organization.id`.<fk table='organization' column='id'/>
     */
    project_id: string;
    /**
     * Note:
     * This is a Primary Key.<pk/>
     * This is a Foreign Key to `user.id`.<fk table='user' column='id'/>
     */
    user_id: string;
  };
  project: {
    /**
     * Note:
     * This is a Primary Key.<pk/>
     */
    id: string;
    api_key: string;
    name: string;
    /**
     * Note:
     * This is a Foreign Key to `organization.id`.<fk table='organization' column='id'/>
     */
    created_by_user_id: string;
    source_language_code:
      | "ab"
      | "aa"
      | "af"
      | "ak"
      | "sq"
      | "am"
      | "ar"
      | "an"
      | "hy"
      | "as"
      | "av"
      | "ae"
      | "ay"
      | "az"
      | "bm"
      | "ba"
      | "eu"
      | "be"
      | "bn"
      | "bh"
      | "bi"
      | "bs"
      | "br"
      | "bg"
      | "my"
      | "ca"
      | "km"
      | "ch"
      | "ce"
      | "ny"
      | "zh"
      | "cu"
      | "cv"
      | "kw"
      | "co"
      | "cr"
      | "hr"
      | "cs"
      | "da"
      | "dv"
      | "nl"
      | "dz"
      | "en"
      | "eo"
      | "et"
      | "ee"
      | "fo"
      | "fj"
      | "fi"
      | "fr"
      | "ff"
      | "gd"
      | "gl"
      | "lg"
      | "ka"
      | "de"
      | "ki"
      | "el"
      | "kl"
      | "gn"
      | "gu"
      | "ht"
      | "ha"
      | "he"
      | "hz"
      | "hi"
      | "ho"
      | "hu"
      | "is"
      | "io"
      | "ig"
      | "id"
      | "ia"
      | "ie"
      | "iu"
      | "ik"
      | "ga"
      | "it"
      | "ja"
      | "jv"
      | "kn"
      | "kr"
      | "ks"
      | "kk"
      | "rw"
      | "kv"
      | "kg"
      | "ko"
      | "kj"
      | "ku"
      | "ky"
      | "lo"
      | "la"
      | "lv"
      | "lb"
      | "li"
      | "ln"
      | "lt"
      | "lu"
      | "mk"
      | "mg"
      | "ms"
      | "ml"
      | "mt"
      | "gv"
      | "mi"
      | "mr"
      | "mh"
      | "ro"
      | "mn"
      | "na"
      | "nv"
      | "nd"
      | "ng"
      | "ne"
      | "se"
      | "no"
      | "nb"
      | "nn"
      | "ii"
      | "oc"
      | "oj"
      | "or"
      | "om"
      | "os"
      | "pi"
      | "pa"
      | "ps"
      | "fa"
      | "pl"
      | "pt"
      | "qu"
      | "rm"
      | "rn"
      | "ru"
      | "sm"
      | "sg"
      | "sa"
      | "sc"
      | "sr"
      | "sn"
      | "sd"
      | "si"
      | "sk"
      | "sl"
      | "so"
      | "st"
      | "nr"
      | "es"
      | "su"
      | "sw"
      | "ss"
      | "sv"
      | "tl"
      | "ty"
      | "tg"
      | "ta"
      | "tt"
      | "te"
      | "th"
      | "bo"
      | "ti"
      | "to"
      | "ts"
      | "tn"
      | "tr"
      | "tk"
      | "tw"
      | "ug"
      | "uk"
      | "ur"
      | "uz"
      | "ve"
      | "vi"
      | "vo"
      | "wa"
      | "cy"
      | "fy"
      | "wo"
      | "xh"
      | "yi"
      | "yo"
      | "za"
      | "zu";
    created_at: string;
    file: string;
  };
  user: {
    /**
     * Note:
     * This is a Primary Key.<pk/>
     */
    id: string;
    email: string;
    created_at: string;
  };
}

export interface parameters {
  /** Preference */
  preferParams: "params=single-object";
  /** Preference */
  preferReturn: "return=representation" | "return=minimal" | "return=none";
  /** Preference */
  preferCount: "count=none";
  /** Filtering Columns */
  select: string;
  /** On Conflict */
  on_conflict: string;
  /** Ordering */
  order: string;
  /** Limiting and Pagination */
  range: string;
  /** Limiting and Pagination */
  rangeUnit: string;
  /** Limiting and Pagination */
  offset: string;
  /** Limiting and Pagination */
  limit: string;
  /** _prisma_migrations */
  "body._prisma_migrations": definitions["_prisma_migrations"];
  /** language */
  "body.language": definitions["language"];
  /** project */
  "body.project": definitions["project"];
  /** project_member */
  "body.project_member": definitions["project_member"];
  /** user */
  "body.user": definitions["user"];
}

export interface operations {}

export interface external {}
