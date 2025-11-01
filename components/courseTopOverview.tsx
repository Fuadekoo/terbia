import Player from "./stream/Player";

interface CourseTopOverviewProps {
  video: string;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}

export default function CourseTopOverview({ video, themeColors }: CourseTopOverviewProps) {

  console.log("CourseTopOverview video:", video);
  return (
    <div className="aspect-video lg:w-3xl bg-black flex gap-y-4 max-md:flex-col-reverse flex-col overflow-hidden">
        {video && <Player src={video} type="local" themeColors={themeColors} />}
    </div>
  );
}
