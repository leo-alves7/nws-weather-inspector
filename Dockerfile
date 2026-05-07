FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY inspector.py .

RUN adduser --disabled-password --no-create-home inspector
USER inspector

CMD ["python", "inspector.py", "--output", "/data/output.json"]
