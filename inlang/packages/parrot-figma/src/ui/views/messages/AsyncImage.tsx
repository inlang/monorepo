import * as React from "react";
import { useEffect } from "react";
import useState from "react-usestateref";
import FigmaUtil from "../../../shared/FigmaUtil";
import LocalizedLabelManagerUI from "../../../lib/localizedlabels/LocalizedLabelManagerUI";

type AsyncImageProps = {
	labelId: string;
	figmaRemote: FigmaUtil;
	localizedLabelManager: LocalizedLabelManagerUI;
};

export default function AsyncImage({
	labelId,
	figmaRemote,
	localizedLabelManager,
}: AsyncImageProps) {
	const [imageEncoded, setImageEncoded] = useState(undefined as string | undefined);

	useEffect(() => {
		const getImageEncoded = async () => {
			const label = await localizedLabelManager.getById(labelId);
			if (label) {
				const data = await figmaRemote.getImageFromFrame(label.rootFrameId, {
					format: "PNG",
					constraint: {
						type: "WIDTH",
						value: 30,
					},
				});

				// const blob = new Blob([data], { type: 'image/png' });
				// onst dataUrl = Buffer.from(data).toString('base64');

				const base64url = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result as string);
					reader.readAsDataURL(new Blob([data]));
				});

				setImageEncoded(base64url);
			}
		};

		getImageEncoded();
	}, []);

	return <img src={imageEncoded} />;
}
