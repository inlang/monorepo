import { useRouter } from "next/dist/client/router";

const LanguageSelector = () => {
  const router = useRouter();

  return (
    <div style={{ position: "absolute", left: "10rem", top: "1rem" }}>
      <label>language: </label>
      <select
        value={router.locale}
        onChange={(event) => {
          // change just the locale and maintain all other route information including href's query
          router.push(
            { pathname: router.pathname, query: router.query },
            router.asPath,
            { locale: event.target.value }
          );
        }}
      >
        {/* show every locale as selection option */}
        {router.locales?.map((locale) => (
          <option key={locale} value={locale}>
            {locale}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
