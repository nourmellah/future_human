import React from "react";

interface CharacterViewerProps {
	layout?: React.CSSProperties;
	bgColor?: string;
	children?: React.ReactNode;
}

const CharacterViewer: React.FC<CharacterViewerProps> = ({
	layout,
	bgColor = "#f346cdd7",
	children,
}) => {
	return (
		<div
			style={{
				width: "400px",
				height: "600px",
				border: "2px dashed gray",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: bgColor,
				...layout,
			}}
		>
			{children ?? <p>XX</p>}
		</div>
	);
};

export default CharacterViewer;

/* 
const CharacterViewer = () => {
  return (
    <iframe
      src="https://demo.readyplayer.me/avatar"
      style={{ width: "100%", height: "600px", border: "none" }}
      title="Avatar Viewer"
    />
  );
};
*/