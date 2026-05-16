# syntax=docker/dockerfile:1.6
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

FROM python:3.12-slim
RUN useradd -m app
USER app
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8080
CMD ["python", "-m", "src.main"]
