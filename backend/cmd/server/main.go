// Command server runs the calculator HTTP API.
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/azrasenakansu/fullstack-calculator/backend/internal/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           api.NewRouter(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("calculator API listening on %s", srv.Addr)
	log.Fatal(srv.ListenAndServe())
}
