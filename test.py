from pathlib import Path
import os

from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader
from magic_pdf.data.dataset import PymuDocDataset
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
from magic_pdf.config.enums import SupportedPdfParseMethod


def pdf_to_markdown(pdf_path: str, output_root: str = "output") -> str:
    pdf_path = Path(pdf_path).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    output_root = Path(output_root).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    base_name = pdf_path.stem
    image_dir = output_root / "images"
    image_dir.mkdir(parents=True, exist_ok=True)

    image_writer = FileBasedDataWriter(str(image_dir))
    md_writer = FileBasedDataWriter(str(output_root))
    reader = FileBasedDataReader("")

    pdf_bytes = reader.read(str(pdf_path))
    ds = PymuDocDataset(pdf_bytes)

    if ds.classify() == SupportedPdfParseMethod.OCR:
        infer_result = ds.apply(doc_analyze, ocr=True)
        pipe_result = infer_result.pipe_ocr_mode(image_writer)
    else:
        infer_result = ds.apply(doc_analyze, ocr=False)
        pipe_result = infer_result.pipe_txt_mode(image_writer)

    md_filename = f"{base_name}.md"
    pipe_result.dump_md(md_writer, md_filename, image_dir.name)

    pipe_result.dump_content_list(
        md_writer,
        f"{base_name}_content_list.json",
        image_dir.name,
    )
    pipe_result.dump_middle_json(
        md_writer,
        f"{base_name}_middle.json",
    )

    infer_result.draw_model(str(output_root / f"{base_name}_model.pdf"))
    pipe_result.draw_layout(str(output_root / f"{base_name}_layout.pdf"))
    pipe_result.draw_span(str(output_root / f"{base_name}_spans.pdf"))

    return str(output_root / md_filename)


if __name__ == "__main__":
    pdf_file = "index.pdf"   # replace with your PDF
    md_file = pdf_to_markdown(pdf_file, "output")
    print(f"Markdown written to: {md_file}")