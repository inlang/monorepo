// A helper that returns Base64 characters and their indices.
const chars = {
	ascii() {
		return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	},
	indices() {
		if (!this.cache) {
			this.cache = {};
			const ascii = chars.ascii();

			for (let c = 0; c < ascii.length; c += 1) {
				const chr = ascii[c];
				this.cache[chr] = c;
			}
		}
		return this.cache;
	},
};

const atob = function (b64: string) {
	const indices = chars.indices();
	const pos = b64.indexOf("=");
	const padded = pos > -1;
	const len = padded ? pos : b64.length;
	let i = -1;
	let data = "";

	while (i < len) {
		const code =
			(indices[b64[++i]] << 18) |
			(indices[b64[++i]] << 12) |
			(indices[b64[++i]] << 6) |
			indices[b64[++i]];
		if (code !== 0) {
			data += String.fromCharCode((code >>> 16) & 255, (code >>> 8) & 255, code & 255);
		}
	}

	if (padded) {
		data = data.slice(0, pos - b64.length);
	}

	return data;
};

// Convert base64url to base64 by padding with '=' and replacing '-' with '+' and '_' with '/'
function base64UrlDecode(str: string) {
	let strToDecode = str.replace(/-/g, "+").replace(/_/g, "/");
	// Decode base64 string
	while (strToDecode.length % 4) {
		strToDecode += "=";
	}
	return atob(strToDecode);
}

function decodeJwt(jwt: string) {
	// Split the JWT into header, payload, and signature
	const parts = jwt.split(".");

	// Decode each part
	const decodedHeader = JSON.parse(base64UrlDecode(parts[0]));
	const decodedPayload = JSON.parse(base64UrlDecode(parts[1]));

	// The signature (parts[2]) is typically used for server-side verification and is not needed for decoding on the client side.

	return {
		header: decodedHeader,
		payload: decodedPayload,
	};
}

export default function getKey() {
	const token = decodeJwt(
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiKiIsImlkIjoicGFycm90LWdldHRpbmctc3RhcnRlZC0xIn0.cgBR5Po10hzYn3HHpSh3VeZi1VkXKVtFOJm6Ou4UIKg",
	);
	return token;
}
