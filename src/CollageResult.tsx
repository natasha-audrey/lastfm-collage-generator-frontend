export function CollageResult({ url }: { url: string }) {
  return (
    <div className="result">
      <img src={url} alt="Generated album collage" />
    </div>
  );
}
