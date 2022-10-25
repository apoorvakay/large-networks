library(shiny)
library(r2d3)
library(jsonlite)
library(tidyverse)
library(visNetwork)
library(dbplyr)
library(DBI)
library(DT)
library(shinyjs)
library(parallel)
library(shinydashboard)
library(r2d3)
library(jsonlite)
library(purrr)

source("embedding_functions.R")



# Define UI for application that draws a histogram
ui <- fluidPage(
  # Application title
  fluidRow(titlePanel("Large Networks")),
  tabsetPanel(
    tabPanel("Data Selection",
             wellPanel(
               fluidRow(column(
                 2,
                 wellPanel(
                   h4("Query"),
                   textInput("keyword", "Key word", "Enter keyword here.."),
                   actionButton("search", "Add query!")
                 )
               ),
               column(10,
                      
                      uiOutput("data_selection"))),
               
               fluidRow(column(2,
                               
                               uiOutput("filter_ui")),
                        column(10,
                               tabsetPanel(
                                 tabPanel("Nodes",
                                          dataTableOutput("query_nodes_data")),
                                 tabPanel("Edges", dataTableOutput("query_edges_data"))
                               )))
             )),
    
    tabPanel("Visualization",
             fluidRow(
               column(
                 2,
                 wellPanel(
                   h4("Visualization"),
                   radioButtons(
                     "colourNodesByUI",
                     "Colour Nodes by:",
                     c("Year of Publication" = "colourNodesByYear",
                       "Cluster" = "colourNodesByCluster"),
                     selected = "colourNodesByYear"
                   ),
                   conditionalPanel(
                     "input.colourNodesByUI == 'colourNodesByCluster'",
                     h4("Clustering"),
                     selectInput(
                       "cluster_method",
                       "Clustering Method",
                       c("K-means  clustering", "Hierarchical clustering")
                     ),
                     conditionalPanel(
                       "input.cluster_method == 'K-means  clustering'",
                       sliderInput("cluster_k", "Choose K-value:", 1, 12, 7)
                     ),
                     checkboxInput("use_raker", "Use RAKER annotation", F)
                   ),
                   
                   h4("Embedding"),
                   sliderInput("lsa_dim", "LSA Dimensions", 5, 100, 5),
                   selectInput(
                     "embedding",
                     "Embedding",
                     c("FR", "KK", "PCA", "TSNE", "UMAP"),
                     selected = "UMAP"
                     
                     
                   ),
                   
                   actionButton("apply_filter", "Plot Network")
                 )
               ),
               
               column(
                 7,
                 tabsetPanel(
                   type = "tabs",
                   id = "tabsID",
                   tabPanel(
                     "Overview",
                     d3Output("overview_graph", height = "600px", width = "100%")
                     
                     
                   ),
                   tabPanel(
                     "Cluster Exploration",
                     d3Output("explore_cluster_graph",  height = "600px", width = "100%")
                   ),
                   tabPanel("Compare Pinned Nodes")
                 )
                 
               ),
               column(
                 3,
                 wellPanel(
                   verbatimTextOutput("selected_node_title", placeholder = FALSE),
                   verbatimTextOutput("selected_node_abstract", placeholder = FALSE),
                   verbatimTextOutput("selected_node_venue", placeholder = FALSE),
                   
                 )
               )
             ))
    
  ),
  
  
  
  tags$head(tags$style(
    HTML(
      "
        .form-control {
            border-radius: 4px 4px 4px 4px;
        }

        #selected_node_title {
        font-family:  'Source Sans Pro','Helvetica Neue',Helvetica,Arial,sans-serif;
        font-size: 14px;
        width: 300px;
        max-width: 100%;
        padding: 6px 12px;
        white-space: pre-wrap;
        }

        "
    )
  )),
  tags$head(tags$style(
    HTML(
      "
        .form-control {
            border-radius: 4px 4px 4px 4px;
        }

        #selected_node_abstract {
        font-family:  'Source Sans Pro','Helvetica Neue',Helvetica,Arial,sans-serif;
        font-size: 14px;
        width: 300px;
        max-width: 100%;
        padding: 6px 12px;
        white-space: pre-wrap;
        }

        "
    )
  )),
  tags$head(tags$style(
    HTML(
      "
        .form-control {
            border-radius: 4px 4px 4px 4px;
        }

        #selected_node_venue {
        font-family:  'Source Sans Pro','Helvetica Neue',Helvetica,Arial,sans-serif;
        font-size: 14px;
        width: 300px;
        max-width: 100%;
        padding: 6px 12px;
        white-space: pre-wrap;
        }

        "
    )
  ))
  
  
  
)
##############################################################################
# Server Side
##############################################################################


# Define server logic required to draw a histogram
server <- function(input, output) {
  #Based on IP parameters - calculate the cluster Ids and the positions
  #reactive function for annotation data

  colourNodesBy <- eventReactive(input$apply_filter,{
    input$colourNodesByUI
  })
  
  tabsID <- eventReactive(input$apply_filter,{
    input$tabsID
  })
  
  output$overview_graph <- renderD3({
    data = data()
    print(data$nodes)
    print(data)
    print(typeof(data))
    r2d3(
      data = data,
      script = "network.js",
      d3_version = "4",
      options = list(
        r2d3.shadow = FALSE,
        colourNodesBy = colourNodesBy(),
        activeTab = tabsID()
      ),
      viewer = "browser"
    )
  })
  
  output$selected_node_title <-
    renderText(paste0("Year/Title: ", req(input$node_title)))
  output$selected_node_abstract <-
    renderText(paste0("Abstract: ", req(input$node_abstract)))
  output$selected_node_venue <-
    renderText(paste0("Venue: ", req(input$node_venue)))
  
  
  observeEvent(input$openClusterTab,
               {
                 updateTabsetPanel(session = getDefaultReactiveDomain(), "tabsID", selected = "Cluster Exploration")
                 
                 
                 output$explore_cluster_graph <- renderD3({
                   req(data())
                   r2d3(
                     data = data(),
                     script = "cluster_exploration.js",
                     d3_version = "4",
                     options = list(
                       r2d3.shadow = FALSE,
                       colourNodesBy = input$colourNodesByUI,
                       activeTab = input$tabsID,
                       group_nodes = input$clusterToExpl
                       
                     )
                   )
                 })
               })
  
  

  
  
  con <- reactive({
    dbConnect(RSQLite::SQLite(), "network.sql")
  })
  
  observe(update_table(T))
  add_query_data <- observeEvent(input$search, {
    print("filter data")
    showNotification("Filter Data...")
    
    query = paste(
      "SELECT * FROM nodes WHERE (title LIKE \'% ",
      input$keyword,
      #"%\') OR (abstract LIKE \'%",
      #input$keyword,
      "%\');",
      sep = ""
    )
    
    showNotification(paste("Process query:", query, sep = " "))
    nodes <-  dbGetQuery(con(), query)
    
    if (nodes %>% tally > 50000) {
      nodes <- nodes %>% sample_n(50000)
    }
    
    
    showNotification("Filter nodes...")
    node_ids = nodes %>%
      select(id, n_citation) %>%
      collect() %>%
      #sample_n(input$n_nodes)%>%
      select(id) %>%
      unique() %>%
      unlist()
    
    showNotification("Filter edges...")
    edges <- tbl(con(), "edges")
    
    current_time = format(Sys.time(), "%c")
    sedges <- edges %>%
      filter(from %in% node_ids) %>%
      filter(to %in% node_ids) %>%
      collect() %>%
      mutate(query = rep(input$keyword, n()),
             time = rep(current_time, n()))
    
    showNotification("Filter nodes...")
    snodes <- nodes %>%
      filter(id %in% node_ids) %>%
      collect() %>%
      mutate(
        query = rep(input$keyword, n()),
        time = rep(current_time, n()),
        n_nodes = rep(n(), n())
      )
    
    showNotification("Finished Filtering!")
    showNotification("Write Nodes ...")
    dbWriteTable(con(), "qnodes", snodes, append = T)
    
    showNotification("Write Edges ...")
    dbWriteTable(con(), "qedges", sedges, append = T)
    showNotification("Saved query data!")
    click("refresh")
    update_table(T)
    # list(
    #
    #   nodes = tbl(con(),"qnodes")%>%collect(),
    #   edges =  tbl(con(),"qedges")%>%collect()
    # )
    
  })
  update_table <- reactiveVal()
  
  #autoInvalidate <- reactiveTimer(3000)
  query_table <- eventReactive(update_table(), {
    tbl(con(), "qnodes") %>%
      select(query, time, n_nodes) %>%
      collect() %>%
      distinct()
  })
  
  output$data_selection <- renderUI({
    req(query_table())
    dataTableOutput("query_data_selection")
  })
  
  output$query_data_selection <- renderDataTable({
    query_table()
  }, selection = list(mode = 'multiple', selected = c(1)),
  options = list(scrollX = TRUE, pageLength = 5))
  
  
  
  
  query_data <- reactive({
    req(query_table())
    req(input$query_data_selection_rows_selected)
    #add_filtered_data()
    sel_row = input$query_data_selection_rows_selected
    sel_query = query_table()[sel_row,]$query %>% unlist()
    sel_time = query_table()[sel_row,]$time %>% unlist()
    
    #filter query data
    nodes = tbl(con(), "qnodes") %>%
      collect() %>%
      filter(query %in% sel_query, time %in% sel_time) %>%
      distinct(id, .keep_all = TRUE) %>%
      select(!c("time", "query"))
    
    edges = tbl(con(), "qedges") %>%
      collect() %>%
      filter(query %in% sel_query, time %in% sel_time)
    
  network_data <-   list(nodes = nodes, edges = edges)
  saveRDS(network_data,'network_layout.Rds')
  network_data
  })
  
  
  igraph_object <- reactive({
    nodes = query_data()$nodes
    edges = query_data()$edges
    
    g <- graph_from_data_frame(edges, vertices = nodes$id)
  })
  
  output$filter_ui <- renderUI({
    req(igraph_object())
    deg = degree(igraph_object())
    max_deg = max(deg)
    min_citations = query_data()$nodes %>% select(n_citation) %>% min()
    max_citations = query_data()$nodes %>% select(n_citation) %>% max()
    tagList(wellPanel(
      h4("Filtering"),
      sliderInput(
        "filter_n_citation",
        "Citations",
        min_citations,
        max_citations,
        c(min_citations, max_citations)
      ),
      
      sliderInput("filter_degree", "Degree", 1, max_deg, c(1, max_deg))
      
    ))
  })
  
  filtered_data <- reactive({
    req(igraph_object())
    req(input$filter_n_citation)
    nodes = query_data()$nodes
    edges = query_data()$edges
    
    g <- igraph_object()
    df_deg <-
      data.frame(list(id = names(V(g)), deg = degree(g))) %>%
      filter(deg > input$filter_degree[1] &
               deg <= input$filter_degree[2])
    
    nodes <- nodes %>%
      filter(id %in% df_deg$id) %>%
      filter(n_citation > input$filter_n_citation[1]) %>%
      filter(n_citation <= input$filter_n_citation[2])
    
    edges <-
      edges %>% filter(from %in% df_deg$id &
                         to %in% df_deg$id) %>% select(!c("time", "query")) %>% distinct()
    
    list(nodes = nodes,
         edges =  edges)
  })
  
  output$query_nodes_data <- renderDataTable({
    req(filtered_data())
    filtered_data()$nodes %>% select(!abstract)
    
  }, options = list(scrollX = TRUE, pageLength = 5))
  
  output$query_edges_data <- renderDataTable({
    #req(filtered_data())
    filtered_data()$edges
    
  }, options = list(scrollX = TRUE, pageLength = 5))
  
  embedding <- reactive({
    req(filtered_data())
    showNotification(paste("Create Embedding..."))
    nodes = filtered_data()$nodes
    edges = filtered_data()$edges
    embedding <- create_network_embedding(
      edges = edges,
      nodes = nodes,
      lsa_dim = input$lsa_dim,
      embedding = input$embedding
    )
    
    showNotification("Finished Embedding!")
    embedding
  })
  
  cluster_emb <- reactive({
    req(embedding())
    showNotification(paste("Clustering... ", "k = ", input$cluster_k, sep =
                             ""))
    cluster_nodes = cluster_embedding(embedding()$emb,
                                      input$cluster_k,
                                      method = input$cluster_method)
    showNotification("Finished Clustering!")
    cluster_nodes
  })
  
  
  data <- eventReactive(input$apply_filter, {
    req(filtered_data())
    req(cluster_emb())
    nodes <- filtered_data()$nodes
    edges <- filtered_data()$edges
    
    emb_nodes <- as.data.frame(nodes) %>%
      cbind(embedding()$emb) %>%
      mutate(title = paste(year, title, sep = "\n")) %>%
      mutate(group = unlist(cluster_emb()$cluster)) %>%
      mutate(cluster = group) %>%
      mutate(value = nodes[["n_citation"]]) %>%
      select(title,
             abstract,
             id,
             x,
             y,
             group,
             value,
             abstract,
             venue,
             year,
             n_citation) %>%
      distinct(id, .keep_all = TRUE)
    
    emb_edges <- edges %>%
      filter(from %in% emb_nodes$id & to %in% emb_nodes$id) %>%
      distinct()
    showNotification(paste("Showing ", nrow(emb_nodes), " nodes"))
    showNotification(paste("Showing ", nrow(emb_edges), " edges"))
    
    list(nodes = emb_nodes, edges = emb_edges,centroid_nodes =  annotate_nodes(emb_nodes)$center_nodes)
    
  })
  
  
  
}

# Run the application
shinyApp(ui = ui, server = server)
