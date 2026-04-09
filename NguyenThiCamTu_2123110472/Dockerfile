# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["NguyenThiCamTu_2123110472.csproj", "./"]
RUN dotnet restore "./NguyenThiCamTu_2123110472.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "NguyenThiCamTu_2123110472.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "NguyenThiCamTu_2123110472.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose port and start
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "NguyenThiCamTu_2123110472.dll"]
