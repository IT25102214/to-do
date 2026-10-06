package Backend.controller;

import Backend.model.todoModel;
import Backend.repository.TodoRepository;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/todos")
@CrossOrigin(origins = "http://localhost:3000")
public class TodoController {

    private final TodoRepository repo;

    public TodoController(TodoRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<todoModel> getAll() {
        return repo.findAll();
    }
//Insert
    @PostMapping
    public ResponseEntity<todoModel> create(@Valid @RequestBody todoModel todo) {
        return new ResponseEntity<>(repo.save(todo), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<todoModel> update(@PathVariable Long id, @Valid @RequestBody todoModel todo) {
        return repo.findById(id).map(t -> {
            t.setTitle(todo.getTitle());
            t.setDescription(todo.getDescription());
            t.setDueDate(todo.getDueDate());
            t.setCompleted(todo.isCompleted());
            return ResponseEntity.ok(repo.save(t));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}